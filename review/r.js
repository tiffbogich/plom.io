var fs = require('fs')
  , util = require('util')
  , path = require('path')
  , async = require('async')
  , mongodb = require('mongodb')
  , ObjectID = require('mongodb').ObjectID
  , spawn = require('child_process').spawn;


var MongoClient = mongodb.MongoClient;

MongoClient.connect("mongodb://localhost:27017/plom", function(err, db) {

  if (err) throw err;

  var diag = new mongodb.Collection(db, 'diag');

  var r = spawn('R', ['CMD', 'BATCH', 'test.R']);
  r.stdout.pipe(process.stdout);
  r.stderr.pipe(process.stdout);

  r.on('exit', function (code) {

    console.log('child process exited with code ' + code);

    fs.readdir('pict', function(err, files){

      files = files
        .filter(function(x) {return (path.extname(x) === '.png');})
        .map(function(x){return path.join('pict', x);});

      async.map(files, fs.readFile, function(err, data){
        if(err) console.log(err);

        data = data.map(function(x){return {'content-type':'image/png', data: x};});
        diag.insert(data, function(err, docs){
          if (err) throw err;


        });

      });

    });

  });

});
