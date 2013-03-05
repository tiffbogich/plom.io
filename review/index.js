var fs = require('fs')
  , util = require('util')
  , mongodb = require('mongodb')
  , ObjectID = require('mongodb').ObjectID
  , path = require('path')
  , async = require('async')
  , Grid = require('gridfs-stream')
  , spawn = require('child_process').spawn
  , mkdirp = require('mkdirp');

var HOST_MODEL_SERVER = 'localhost';
var PORT_MODEL_SERVER = 4000;

var MongoClient = mongodb.MongoClient;

MongoClient.connect("mongodb://localhost:27017/plom", function(err, db) {

  if (err) throw err;
  console.log("Connected to mongodb");

  var components = new mongodb.Collection(db, 'components');

  //mark element that is going to be processed
//  components.findAndModify({_id: _id}, {}, {$set:{'review.0.processed':true}}, function(err, doc){
  components.findOne({type: 'link'}, function(err, doc){
    if(err) throw err;

    var theta = doc.review[0];

    //if kmcmc or pmcmc
    if('trace_checksum' in theta){

      //build unique directory for the diagnostic
      mkdirp(theta.semantic_id, function(err){

        //stream tar.gz
        var gfs = Grid(db, mongodb);

        gfs.files.findOne({ filename: theta.trace_checksum }, function (err, file) {

          var readstream = gfs.createReadStream(file._id)
            , targz = fs.createWriteStream(path.join(theta.semantic_id, theta.trace_checksum));

          readstream.pipe(targz);

          targz.on('close', function(){

            console.log('done');
            //run diagnostic script

            //add pngs to mongo

            //delete directory

            db.close();

          });



        });


      });
    }

    db.close();

  });

});
