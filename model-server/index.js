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
  , spawn = require('child_process').spawn;

var app = express();

// Configuration
app.configure(function(){
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});


// Routes

/**
 * install
 **/
app.post('/install', function(req, res){

  var model = req.body;

  var pmbuilder = spawn('pmbuilder', ['--input', 'stdin', '-o', 'my_model', '--zip']); //{cwd: xxx}
  pmbuilder.stdin.write(JSON.stringify(model)+'\n', encoding="utf8");
  //echo
  //pmbuilder.stdout.on('data', function (data) {console.log('stdout: ' + data);});
  //pmbuilder.stderr.on('data', function (data) {console.log('stderr: ' + data);});

  pmbuilder.on('exit', function (code) {

    if(code === 0) {
      //we want the content-length to use a progress bar so we use stat...
      fs.stat('my_model.tar.gz', function(err, stats){
        res.set({'Content-Type': 'application/x-gzip',
                 'Content-Length': stats.size});
        fs.createReadStream('my_model.tar.gz').pipe(res);
      });

    } else {
      res.set('Content-Type', 'text/plain');
      res.send('\033[91m' + 'FAIL' + '\033[0m' + ': something went wrong\n');
    }

  });

});



/**
 * search
 **/

app.post('/search', function(req, res){

  var q = req.body.q; //query

  var components = req.app.get('components');

  components.find(dbUtil.querify(q), {context_name:1, process_name:1, name:1}).toArray(function(err, docs){
    if (err) return next(err);
    res.json(docs);   
  });


});



/**
 * fetch
 **/
app.post('/fetch', function(req, res){

  var _idString = req.body._idString;

  var trees = req.app.get('trees')
    , components = req.app.get('components');

  components.findOne({_id: new ObjectID(_idString)}, function(err, doc){
    if (doc){
      res.json(doc);
    } else {
      trees.findOne({_id: new ObjectID(_idString)}, function(err, doc){
        if(doc){
          res.json(doc);
        }else {
          res.set('Content-Type', 'text/plain');
          res.send('\033[91mFAIL\033[0m: could not find the resource');
        }
      });
    }
  });
});


/**
 * store results in GridFs and respond with file object
 **/
app.post('/results/:sha', function(req, res){

  var gfs = Grid(req.app.get('db'), mongodb);

  gfs.files.find({ filename: req.params.sha }).toArray(function (err, files) {
    if (err) return next(err);

    if (files.length){ //file  already exists
      res.json(files[0]);
    } else {
      var writestream = gfs.createWriteStream(req.params.sha);
      req.pipe(writestream);
      writestream.on('close', function (file) {
        res.json(file);
      });
    }      
  });

});


/**
 * Publish
 **/
app.post('/publish', function(req, res){

  var m = req.body
    , collection = req.app.get('components');

  res.set('Content-Type', 'text/plain');

  var my_semantic_ids = [m.context.semantic_id, m.process.semantic_id, m.link.semantic_id];
  if('theta' in m){
    my_semantic_ids.push(m.theta.semantic_id);
  }

  collection
    .find({semantic_id: {$in: my_semantic_ids}})
    .toArray(function(err, docs){
      if(err) return next(err);

      var published = {
        context: undefined,
        process: undefined,
        link: undefined
      };

      var retrieved_theta;

      docs.forEach(function(doc){
        published[doc.type] = doc;
        if(doc.type === 'theta'){
          retrieved_theta = doc;
        }
      });

      if(published.link){
        m.link = published.link;
      }

      if( retrieved_theta || ( ('theta' in m) && ('review' in m.link) && m.link.review.map(function(x){return x.semantic_id;}).indexOf(m.theta.semantic_id) !== -1) ){
        return res.send('\033[91mFAIL\033[0m: the design has already been published\n');
      } else if ('theta' in m) {

        //add theta to be reviewed
        if(!('review' in m.link)){
          m.link.review = [m.theta];
        } else {
          m.link.review.push(m.theta);
        }
      }

      var to_be_published = [];
      for(var key in published){
        if(!published[key]){
          m[key]._keywords = dbUtil.addKeywords(m[key]);
          to_be_published.push(m[key]);
        }
      }

      if(to_be_published.length){        

        collection.insert(to_be_published, {safe: true}, function(err, records){
          if(err) return next(err);
          
          records.forEach(function(record){
            published[record.type] = record;
          });
         
          m.link.context_id = published.context._id;
          m.link.context_name = published.context.name;

          m.link.process_id = published.process._id;
          m.link.process_name = published.process.name;

          console.log(published.context._keywords, published.process._keywords);
          m.link._keywords = _.unique(m.link._keywords.concat(published.context._keywords, published.process._keywords));

          collection.update({_id:published.link._id},
                            m.link, 
                            {safe:true},
                            function(err, cnt){
                              if(err) return next(err);

                              if ('theta' in m) {                              
                                res.send('\033[92mSUCCESS\033[0m: your results are being reviewed.\n');
                              }else {
                                res.send('\033[92mSUCCESS\033[0m: your model has been published.\n');
                              }
                            });         

        });

      } else if ('theta' in m) {
        //update link

        collection.update({_id:published.link._id},
                          m.link, 
                          {safe:true},
                          function(err, cnt){
                            if(err) return next(err);
                            
                            res.send('\033[92mSUCCESS\033[0m: your results are being reviewed.\n');
                          });         

    
      } else {
        res.send('\033[91mFAIL\033[0m: everything has already been published\n');
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


  //TODO ensureIndex

  server.listen(4000, function(){
    console.log("Express server listening on port %d in %s mode", server.address().port, app.settings.env);
  });

});
