var express = require('express')
  , fs = require('fs')
  , http = require('http')
  , util = require('util')
  , mongodb = require('mongodb')
  , ObjectID = require('mongodb').ObjectID
  , path = require('path')
  , async = require('async')
  , Grid = require('gridfs-stream')
  , dbUtil = require('../db-utils')
  , _ = require('underscore')
  , fstream = require("fstream")
  , tar = require("tar")
  , zlib = require("zlib")
  , rimraf = require("rimraf")
  , authenticate = require('../authentification/routes/user').authenticate
  , spawn = require('child_process').spawn;

var app = express();

// Configuration
app.configure(function(){
  app.use(express.bodyParser({uploadDir:'./uploads'}));
  app.use(express.methodOverride());
  app.use(express.cookieParser());

  app.use(express.basicAuth(function(username, password, callback){
    authenticate(app.get('users'), username, password, callback);
  }));

  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});


// Routes

app.get('/', function(req, res, next){
  res.json({success:true});
});



/**
 * get components
 **/
app.get('/get/:_id', function(req, res, next){

  var components = req.app.get('components');
  components
    .findOne({_id: new ObjectID(req.params._id)},
             {context_disease:0,
              context_name:0,
              process_name:0,
              username:0,
              _id:0,
              process_id:0,
              context_id:0,
              _keywords:0,
              review:0,
              semantic_id:0},
             function(err, doc){
               if (err) return next(err);
               res.json(doc);
             });

});


/**
 * search
 **/
app.post('/search', function(req, res, next){

  var components = req.app.get('components');

  components.find(dbUtil.querify(req.body.q, req.body.disease), {context_disease:1, context_name:1, process_name:1, name:1}).toArray(function(err, docs){
    if (err) return next(err);
    res.json(docs);
  });

});



/**
 * fetch
 **/
app.post('/fetch', function(req, res, next){

  var components = req.app.get('components');

  components
    .find(dbUtil.querify(req.body.q, req.body.disease),
         {_id:1, context_id:1, process_id:1, context_disease:1, context_name:1, process_name:1, name:1})
    .toArray(function(err, docs){
      if (err) return next(err);
      res.json(docs);
    });

});


/**
 * build
 **/
app.post('/build', function(req, res, next){

  var buildPath = path.join('builds', req.body.link.semantic_id, 'model');

  var model = JSON.stringify(req.body);

  function streamModel (res){
    res.statusCode = 200;
    fstream.Reader({path: buildPath, type: "Directory"})
      .pipe(tar.Pack())
      .pipe(zlib.createGzip())
      .pipe(res);
  };
  
  fs.exists(buildPath, function(exists){

    if (exists) {
      //TODO: check that bin also exists and send temporary unavailable if not (=> ongoing compilation)
      streamModel(res);
      
    } else {
      
      var pmbuilder = spawn('pmbuilder', ['--input', 'stdin', '-o', buildPath]);
      pmbuilder.stdin.write(model+'\n', encoding="utf8");
      
      pmbuilder.on('exit', function (code) {
        if(code === 0) {
          var make = spawn('make', ['CC=gcc-4.7', 'install'], {cwd:path.join(buildPath, 'C', 'templates')});
          
          make.on('exit', function (code) {
            
            if(code === 0){
              streamModel(res);
            } else {
              res.status(500).json({success:false});
            }
            
          });
        } else {
          res.status(500).json({success:false});
        }
      });

    }

  });
    
});


/**
 * Publish
 **/
app.post('/publish', function(req, res, next){

  var m;
  if(req.body.model){
    m = JSON.parse(req.body.model);
  } else {
    m = req.body;
  }

  var components = req.app.get('components');

  var my_semantic_ids = [m.context.semantic_id, m.process.semantic_id, m.link.semantic_id];
  if('theta' in m){
    my_semantic_ids.push(m.theta.semantic_id);
  }

  components
    .find({semantic_id: {$in: my_semantic_ids}})
    .toArray(function(err, docs){
      if(err) return next(err);

      var published = {
        context: undefined,
        process: undefined,
        link: undefined,
        theta: undefined
      };

      docs.forEach(function(doc){
        published[doc.type] = doc;
      });

      if(published.theta){
        return res.json({'success': false, 'msg': 'the design has already been published'});
      }

      var to_be_published = [];
      for(var key in published){
        if(!published[key] && m[key]){
          m[key]._keywords = dbUtil.addKeywords(m[key]);
          to_be_published.push(m[key]);
        }
      }

      if(to_be_published.length){

        components.insert(to_be_published, {safe: true}, function(err, records){
          if(err) return next(err);

          var is_new_theta = (! published.theta) && ('theta' in m);

          records.forEach(function(record){
            published[record.type] = record;
          });

          //update link:
          var update = {
            $set: {
              context_id: published.context._id,
              context_disease: published.context.disease,
              context_name: published.context.name,
              process_id: published.process._id,
              process_name: published.process.name
            },
            $addToSet: {_keywords: {$each :published.context._keywords.concat(published.process._keywords)}}
          };

          if (is_new_theta) {
            update['$push'] = {theta_id: published.theta._id};
          }

          //update link
          components.update({_id: published.link._id}, update, {safe:true}, function(err, cnt){
            if(err) return next(err);

            if(! is_new_theta){
              res.json({'success': true, 'msg': 'your model has been published'});
            }
          });


          //store traces in mongo and update theta
          if (is_new_theta) {
            if(req.files){
              var gfs = Grid(req.app.get('db'), mongodb);
              var writestream = gfs.createWriteStream(req.body.trace_checksum)
                , readstream = fs.createReadStream(req.files.traces.path);

              readstream.pipe(writestream);

              writestream.on('close', function (file) {
                //note: we wait that the tarball has been uploaded to mongo before running the R script as we need to avoid race condition on deletion

                var r = spawn('Rscript', [path.join(process.env.HOME, 'plom-coda', 'coda_mcmc_diag.R'), req.files.traces.path]);

                r.on('exit', function (code) {
                  if(code === 0){
                    var exDir = req.files.traces.path + '_ex';
                    fs.readdir(exDir, function(err, files){
                      files = files
                        .filter(function(x) {return (path.extname(x) === '.png');})
                        .map(function(x){return path.join(exDir, x);});

                      async.map(files, fs.readFile, function(err, data){
                        if(err) return next(err);

                        data = data.map(function(x){return {'content-type':'image/png', data: x};});
                        var diag = req.app.get('diag');
                        diag.insert(data, function(err, docs){
                          if (err) return next(err);
                          fs.readFile(path.join(exDir, 'diagnostic.json'), 'utf8', function(err, diagnostic){
                            if (err) return next(err);

                            components.update({_id: published.theta._id}, {$pushAll: {pict_id: docs.map(function(x){return x._id;})}, $set: {diagnostic: JSON.parse(diagnostic)}}, {safe:true}, function(err, cnt){
                              if (err) return next(err);

                              //clean up R workink directory
                              rimraf(exDir, function(err){
                                if (err) return next(err);

                                //upload file
                                fs.unlink(req.files.traces.path, function(err){
                                  if (err) return next(err);

                                  res.json({'success': true, 'msg': 'your results are being reviewed'});
                                });
                              });
                            });  
                            
                          });
                 
                        });
                      });
                    })
                  }
                });                
              });
            } else {
              res.json({'success': true, 'msg': 'your results are being reviewed'});
            }
          }
        });
        
      } else {
        return res.json({'success': false, 'msg': 'everything has already been published'});
      }
    });
});















var server = http.createServer(app);

var MongoClient = mongodb.MongoClient;

MongoClient.connect("mongodb://localhost:27017/plom", function(err, db) {

  if (err) throw err;
  console.log("Connected to mongodb");

  //store ref to db and the collections so that it is easily accessible (app is accessible in req and res!)
  app.set('db', db);
  app.set('users',  new mongodb.Collection(db, 'users'));
  app.set('components',  new mongodb.Collection(db, 'components'));
  app.set('diag',  new mongodb.Collection(db, 'diag'));

  //TODO ensureIndex

  server.listen(4000, function(){
    console.log("Express server listening on port %d in %s mode", server.address().port, app.settings.env);
  });

});
