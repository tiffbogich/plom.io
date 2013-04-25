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
  , ppriors = require('plom-priors')
  , log = require('./lib/log')
  , update = require('./lib/update')
  , schecksum = require('plom-schecksum');

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

  var model = req.body;

  //compute semantic_id for the path
  [model.context, model.process].forEach(function(x){
    x['semantic_id'] = schecksum(x);
  });
  //for link, we include the semantic id_of context and process.
  model.link.context_semantic_id = m.context.semantic_id;
  model.link.process_semantic_id = m.process.semantic_id;
  model.link.semantic_id = schecksum(m.link);    

  var buildPath = path.join('builds', model.link.semantic_id, 'model');

  var model = JSON.stringify(model);

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
    m.link.prior = ppriors.extract(m);
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
    //for link, we include the semantic id_of context, process and link.
    m.theta.context_semantic_id = m.context.semantic_id;
    m.theta.process_semantic_id = m.process.semantic_id;
    m.theta.link_semantic_id = m.link.semantic_id;

    m.theta.semantic_id = schecksum(m.theta);
    my_semantic_ids.push(m.theta.semantic_id);

    //add captions
    ppriors.getCaptions(m, m.theta);
    for(var r=0; r<m.theta.result.length; r++){
      ppriors.getCaptions(m, m.theta.result[r].theta);
    }    
  }

  //add id to reactions
  m.process.model.forEach(function(r, id){
    r.id = id;
  });

   
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

      var events = req.app.get('events');
      
      //update and log everything non theta related
      async.series([
        function(cb){
          if(!status.context){ log.context(events, comps, req.user, cb); } else {cb(null);}
        },
        function(cb){
          if(!status.link){ update.link(components, comps, cb); } else {cb(null);}          
        },       
        function(cb){
          if(!status.link || !status.process){ log.link(events, comps, req.user, cb); } else {cb(null);}
        }
      ], function(err){
        if(err) return next(err);

        if(!( ('theta' in status) && !status.theta)){ //no new theta
          return res.json({'success': true, 'msg': 'your model has been published'});
        }

        //update and log theta (note that link has to be updated too...)
        async.waterfall([
          function(cb){
            ppriors.commit(req.app.get('priors'), comps.link.prior, comps, req.user, cb);
          },
          function(priors, cb){
            update.theta(components, comps, cb);
          },
          function(cnt, cb){
            log.theta(events, comps, req.user, cb);
          },
          function(e, cb){
            commitTrace(req.app.get('db'), req.files, comps, req.user, cb);            
          }
        ], function(err, msg){
          if(err) return next(err);
          res.json(msg);

        }); //end async.waterfall

      }); //end async.series
            
    });

  });

});


/**
 * store files in mongo gridfs and start diagnostic
 */

function commitTrace(db, filesObj, comps, user, cb){

  var gfs = Grid(db, mongodb);
  async.mapLimit(Object.keys(filesObj), 4, function(key, callback){

    var type_h = key.split('_');

    var writestream = gfs.createWriteStream({
      _id: new ObjectID(),
      filename: key + '.csv.gz',
      mode:'w',
      content_type: 'application/x-gzip',   
      metadata: {type: type_h[0], trace_id: parseInt(type_h[1], 10), theta_id: comps.theta._id}
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
      conn.end(JSON.stringify({
        context_id: comps.context._id,
        process_id: comps.process._id,
        link_id: comps.link._id,
        theta_id: comps.theta._id,
        username: user
      }));

      cb(null, {'success': true, 'msg': 'your results are being reviewed'});
    });

  });

}








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
