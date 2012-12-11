var express = require('express')
  , fs = require('fs')
  , http = require('http')
  , util = require('util')
  , mongodb = require('mongodb')
  , ObjectID = require('mongodb').ObjectID
  , path = require('path')
  , PlomTrees = require('../db').PlomTrees
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

  var trees = req.app.get('trees')
    , components = req.app.get('components');

  var ptrees =  new PlomTrees(components, trees);

  res.set('Content-Type', 'text/plain');

  ptrees.findComponents(q, function(err, cursor){
    cursor.each(function(err, doc){
      if(doc){
        res.send(util.format('\033[94m%s\033[0m: _id: %s, name: %s, description: %s\n', doc.type, doc._id, doc.name, doc.description));
      } else{
        ptrees.search(q, function(err, cursor2){
          cursor2.each(function(err, doc){
            if(doc){
              res.send(util.format('\033[94m%s\033[0m: _id: %s, diseases: %s', 'tree\n', doc._id, doc.disease.join(' ; ')));
            } else {
              res.send('\033[91mFAIL\033[0m: could not find the resource\n');
            }
          });
        });
      }
    });
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
 * Publish
 **/
app.post('/publish', function(req, res){

  var component = req.body.component
    , tree_idString = req.body.tree_idString
    , parent_idString = req.body.parent_idString;

  var trees = req.app.get('trees')
    , components = req.app.get('components');

  var ptrees =  new PlomTrees(components, trees);

  res.set('Content-Type', 'text/plain');

  if(typeof tree_idString === 'undefined' &&  typeof parent_idString === 'undefined'){

    if(component.type === 'context' || component.type === 'process'){
      //insert component (not in a tree)
      ptrees.insertComponent(component, function(err, doc){
        res.send(util.format('\033[92m' + 'SUCCESS' + '\033[0m' + ':  %s has been successfully published under the _id: %s\n', doc.name, doc._id));
      });
    } else {
      res.send('\033[91m' + 'FAIL' + '\033[0m' + ': link and theta objects cannot be published without being attached to a tree.\n');
    }

  }else if(tree_idString && parent_idString){

    ptrees.insertComponentAt(component, tree_idString, parent_idString, function(err, doc){
      res.send(util.format('\033[92m' + 'SUCCESS' + '\033[0m' + ':  %s has been successfully published in the tree under the _id: %s\n', doc.name, doc._id));
    });

  }

});





var server = http.createServer(app);
var db = new mongodb.Db('plom', new mongodb.Server("127.0.0.1", 27017), {safe:true});
db.open(function (err, client) {

  if (err) throw err;
  console.log("Connected to mongodb");

  //store ref to the collections so that it is easily accessible (app is accessible in req and res!)
  app.set('users',  new mongodb.Collection(client, 'users'));
  app.set('trees',  new mongodb.Collection(client, 'trees'));
  app.set('components',  new mongodb.Collection(client, 'components'));

  //TODO ensureIndex

  server.listen(4000, function(){
    console.log("Express server listening on port %d in %s mode", server.address().port, app.settings.env);
  });

});
