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

  //do not use bodyParser for requests that need to be streamed
  var parse = express.bodyParser();
  app.use(function(req, res, next){
    if (0 == req.url.indexOf('/traces')) return next();
    parse(req, res, next);
  });

//  app.use(express.bodyParser({uploadDir:'./uploads'}));

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
 * store results in GridFs and respond with file object
 **/
app.post('/traces/:sha', function(req, res, next){

  var gfs = Grid(req.app.get('db'), mongodb);

  var filename = req.params.sha;
  var writestream = gfs.createWriteStream(filename);
  req.pipe(writestream);

  writestream.on('close', function (file) {
    res.json(file);
  });


});


/**
 * Publish
 **/
app.post('/publish', function(req, res, next){

  var m = req.body
    , collection = req.app.get('components');

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

        return res.json({'success': false, 'msg': 'the design has already been published'});

      } else{

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

            if ('theta' in m) {
              update['$push'] = {review: m.theta};
            }

            collection.update({_id:published.link._id},
                              update,
                              {safe:true},
                              function(err, cnt){
                                if(err) return next(err);

                                if ('theta' in m) {
                                  res.json({'success': true, 'msg': 'your results are being reviewed'});
                                }else {
                                  res.json({'success': true, 'msg': 'your model has been published'});
                                }
                              });

          });

        } else if ('theta' in m) {

          //update link
          collection.update({_id:published.link._id},
                            {$push: {review: m.theta}},
                            {safe:true},
                            function(err, cnt){
                              if(err) return next(err);
                              res.json({'success': true, 'msg': 'your results are being reviewed'});
                            });

        } else {
          return res.json({'success': false, 'msg': 'everything has already been published'});
        }
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
