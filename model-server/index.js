var express = require('express')
  , fs = require('fs')
  , http = require('http')
  , net = require('net')
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
 * clone
 **/
app.post('/clone', function(req, res, next){

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
 * Commit
 **/
app.post('/commit', function(req, res, next){

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

          var is_new_theta = (! published.theta) && ('theta' in m)
            , is_new_context = (! published.context) && ('context' in m)
            , is_new_process = (! published.process) && ('process' in m)
            , is_new_link = (! published.link) && ('link' in m);

          //simplify access
          records.forEach(function(record){
            published[record.type] = record;
          });

          var events = req.app.get('events');

          //register event for context creation:
          if(is_new_context){
            events.insert({
              from: req.user,
              type: 'create',
              option: 'context',
              context_id: published.context._id,
              name: published.context.disease.join('; ') + ' / ' +  published.context.name            
            }, function(err, docs){if(err) return next(err);});
          }

          //update link:
          if(is_new_link || is_new_theta){
            var linkUpdate = {
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
              linkUpdate['$push'] = {theta_id: published.theta._id};
            }

            //update link
            components.update({_id: published.link._id}, linkUpdate, {safe:true}, function(err, cnt){
              if(err) return next(err);
              if(! is_new_theta){
                res.json({'success': true, 'msg': 'your model has been published'});
              }
            });
          }

          //register event for link == model creation:
          if(is_new_link || is_new_process){
            events.insert({
              from: req.user,
              type: 'create',
              option: 'model',
              context_id: published.context._id,
              process_id: published.process._id,
              link_id: published.link._id,
              name: published.context.disease.join('; ') + ' / ' +  published.context.name + ' / ' + published.process.name + ' - ' + published.link.name
            }, function(err, docs){if(err) return next(err);});
          }


          //update theta
          if (is_new_theta) {

            var thetaUpdate = {
              $set: {
                context_id: published.context._id,
                context_disease: published.context.disease,
                context_name: published.context.name,
                process_id: published.process._id,
                process_name: published.process.name,
                link_id: published.link._id,
                link_name: published.link.name
              }
            };
            components.update({_id: published.theta._id}, thetaUpdate, {safe:true}, function(err, cnt){
              if(err) return next(err);
            });
            
            //register event
            events.insert({
              from: req.user,
              type: 'create',
              option: 'theta',
              context_id: published.context._id,
              process_id: published.process._id,
              link_id: published.link._id,
              theta_id: published.theta._id,
              name: published.context.disease.join('; ') + ' / ' +  published.context.name + ' / ' + published.process.name + ' - ' + published.link.name
            }, function(err, docs){if(err) return next(err);});

            //store traces in mongo and start diagnostic
            if(req.files){
              var gfs = Grid(req.app.get('db'), mongodb);
              var writestream = gfs.createWriteStream(req.body.trace_checksum)
                , readstream = fs.createReadStream(req.files.traces.path);

              readstream.pipe(writestream);

              writestream.on('close', function (file) {
                //send the traces to diagnostic
                var conn = net.createConnection(5000, function(){
                  conn.end(JSON.stringify({fileId:file._id.toString(), thetaId: published.theta._id}));
                  res.json({'success': true, 'msg': 'your results are being reviewed'});
                });

              });
            } else {
              res.json({'success': true, 'msg': 'your results are being reviewed'});
            }
          }

        }); //end insert callback

      } else { //nothing to be published
        return res.json({'success': false, 'msg': 'everything has already been published'});
      }
    });
});




//makes sure that necessary directories exist
if(!fs.existsSync(path.join(__dirname, 'uploads'))){
  fs.mkdirSync(path.join(__dirname, 'uploads'));
}
if(!fs.existsSync(path.join(__dirname, 'builds'))){
  fs.mkdirSync(path.join(__dirname, 'builds'));
}

var server = http.createServer(app);
var MongoClient = mongodb.MongoClient;

MongoClient.connect("mongodb://localhost:27017/plom", function(err, db) {

  if (err) throw err;
  console.log("Connected to mongodb");

  //store ref to db and the collections so that it is easily accessible (app is accessible in req and res!)
  app.set('db', db);
  app.set('users', new mongodb.Collection(db, 'users'));
  app.set('events', new mongodb.Collection(db, 'events'));
  app.set('components', new mongodb.Collection(db, 'components'));
  app.set('diag', new mongodb.Collection(db, 'diag'));

  //TODO ensureIndex

  server.listen(4000, function(){
    console.log("Express server listening on port %d in %s mode", server.address().port, app.settings.env);
  });

});
