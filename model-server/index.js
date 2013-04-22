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
  , spawn = require('child_process').spawn
  , priors = require('./lib/priors')
  , schecksum = require('./lib/schecksum');

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

  //add priors to link
  if('theta' in m){
    m.link.prior = priors(m);
  }

  //add semantic_id
  [m.context, m.process].forEach(function(x){
    x['semantic_id'] = schecksum(x);
  });

  //for link, we include the semantic id_of context and process.
  m.link.context_semantic_id = m.context.semantic_id;
  m.link.process_semantic_id = m.process.semantic_id;
  m.link.semantic_id = schecksum(m.link);    
  delete m.link.context_semantic_id;
  delete m.link.process_semantic_id;

  var my_semantic_ids = [m.context.semantic_id, m.process.semantic_id, m.link.semantic_id];
  if('theta' in m){
    m.theta.semantic_id = schecksum(m.theta);
    my_semantic_ids.push(m.theta.semantic_id);
  }

   
  var ups = {};
  for(var k in m){
    ups[k] = (function(k){
      return function(callback){  
        components.findAndModify({semantic_id: m[k].semantic_id},[], {$set: {semantic_id: m[k].semantic_id}}, {safe:true, upsert:true}, function(err, doc){
          callback(err, doc._id);
        });
      }
    })(k);
  }

  async.parallel(ups, function(err, status){

    var to_be_published = []
      , to_be_retrieved = [];

    for(var key in status){
      if(!status[key]){
        m[key]._keywords = dbUtil.addKeywords(m[key]);
        m[key].username = req.user;
        to_be_published.push(m[key]);
      } else {
        to_be_retrieved.push(status[key]);
      }
    }

    if(!to_be_published.length){
      return res.json({'success': false, 'msg': 'everything has already been published'});
    }

    async.parallel({
      retrieved: function(callback){
        if(to_be_retrieved.length){
          components.find({semantic_id: {$in: my_semantic_ids}}).toArray(callback);
        } else {
          callback(null, []);
        }
      },
      published: function(callback){
        async.map(to_be_published, function(item, cb){
          components.findAndModify({semantic_id: item.semantic_id}, [], item, {safe: true, 'new': true}, cb);
        }, callback); 

      }
    }, function(err, results){

      var comps = {};
      results.published.concat(results.retrieved).forEach(function(comp){
        comps[comp.type] = comp;
      });
      
      updateAndLog({components:components, events:req.app.get('events')}, comps, status, req.user, function(err){
        if(err) return next(err);

        commitPriors({priors:req.app.get('priors')}, comps, status, req.user, function(err, msg){
          if(err) return next(err);          
          if(msg) return res.json(msg);

          commitTrace(req.app.get('db'), req.files, comps.theta._id, function(err, msg){
            if(err) return next(err);
            res.json(msg);
          });

        })

      });
      
    });

  });

});

function commitTrace(db, filesObj, theta_id, cb){

  //store files in mongo gridfs and start diagnostic

  var gfs = Grid(db, mongodb);
  async.mapLimit(Object.keys(filesObj), 4, function(key, callback){

    var type_h = key.split('_');

    var writestream = gfs.createWriteStream({
      _id: new ObjectID(),
      filename: key + '.csv.gz',
      mode:'w',
      content_type: 'application/x-gzip',   
      metadata: {type: type_h[0], h: parseInt(type_h[1], 10), theta_id: theta_id}
    });

    fs.createReadStream(filesObj[key].path).pipe(writestream);
    writestream.on('close', function(file){
      callback(null, file);
    });                
  }, function(err, results){

    //clean up
    var toclean = [];
    for(var f in filesObj){
      toclean.push(filesObj[f].path);
    }

    async.map(toclean, fs.unlink, function(err){
      if (err) return cb(err);
    });

    //send the traces to diagnostic
    var conn = net.createConnection(5000, function(){
      conn.end(JSON.stringify({theta_id: theta_id}));

      cb(null, {'success': true, 'msg': 'your results are being reviewed'});
    });

  });

}

function commitPriors (collections, comps, status, user, cb){

  var priors = collections.priors;

  var is_new_theta = ( ('theta' in status) && !status.theta);
  if(is_new_theta){

    //store priors
    comps.link.prior.forEach(function(p){
      p.username = user;
      p.context_id = comps.context._id;
      p.model_id = (p.type === 'observation') ?  comps.link._id : comps.process._id;
      p.semantic_id = schecksum(p);
    });
    
    //upsert
    async.map(comps.link.prior, function(item, callback){
      priors.update({semantic_id: item.semantic_id}, item, {safe:true, upsert:true}, function(err, count){
        callback(err, count);
      });
    }, function(err, results){
      cb(err, null);
    });

  } else {
    cb(null, {'success': true, 'msg': 'your model has been published'});
  }

}


function updateAndLog (collections, comps, status, user, cb){

  var events = collections.events
    , components = collections.components;

  var is_new_theta = ( ('theta' in status) && !status.theta);

  async.series([
    function(callback){
      //register event for context creation:
      if(!status.context){
        events.insert({
          from: user,
          type: 'create',
          option: 'context',
          context_id: comps.context._id,
          name: comps.context.disease.join('; ') + ' / ' +  comps.context.name
        }, function(err, doc){
          callback(err, doc);
        });
      } else {
        callback(null);
      }
    },

    function(callback){      
      //update link:
      if(!status.link || is_new_theta ){
        var linkUpdate = {
          $set: {
            context_id: comps.context._id,
            context_disease: comps.context.disease,
            context_name: comps.context.name,
            process_id: comps.process._id,
            process_name: comps.process.name,
            process_model: comps.process.model //used to store embedded discussion
          },
          $addToSet: {_keywords: {$each :comps.context._keywords.concat(comps.process._keywords)}}
        };

        if (is_new_theta) {
          linkUpdate['$push'] = {theta_id: comps.theta._id};
        }

        components.update({_id: comps.link._id}, linkUpdate, {safe:true}, function(err, cnt){
          callback(err, cnt);
        });
      } else {
        callback(null);
      }
    },

    function(callback){      
      //register event for link == model creation:
      if(!status.link || !status.process){
        events.insert({
          from: user,
          type: 'create',
          option: 'model',
          context_id: comps.context._id,
          process_id: comps.process._id,
          link_id: comps.link._id,
          name: comps.context.disease.join('; ') + ' / ' +  comps.context.name + ' / ' + comps.process.name + ' - ' + comps.link.name
        }, function(err, doc){
          callback(err, doc);
        });
      } else {
        callback(null);
      }
    },

    function(callback){
      //update theta
      if (is_new_theta) {        
        var thetaUpdate = {
          $set: {
            context_id: comps.context._id,
            context_disease: comps.context.disease,
            context_name: comps.context.name,
            process_id: comps.process._id,
            process_name: comps.process.name,
            link_id: comps.link._id,
            link_name: comps.link.name
          }
        };
        components.update({_id: comps.theta._id}, thetaUpdate, {safe:true}, function(err, cnt){
          callback(err, cnt);
        });
      } else {
        callback(null);
      }
    },

    function(callback){      
      //register event for theta creation

      if (is_new_theta) {        
        events.insert({
          from: user,
          type: 'create',
          option: 'theta',
          context_id: comps.context._id,
          process_id: comps.process._id,
          link_id: comps.link._id,
          theta_id: comps.theta._id,
          name: comps.context.disease.join('; ') + ' / ' +  comps.context.name + ' / ' + comps.process.name + ' - ' + comps.link.name
        }, function(err, doc){
          callback(err, doc);
        });
      } else {
        callback(null);
      }
    }
              
  ], function(err, results){
    cb(err);
  });

  
};










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
  app.set('priors', new mongodb.Collection(db, 'priors'));

  //TODO ensureIndex

  server.listen(4000, function(){
    console.log("Express server listening on port %d in %s mode", server.address().port, app.settings.env);
  });

});
