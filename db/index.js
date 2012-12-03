var mongodb = require('mongodb')
  , bcrypt = require('bcrypt')
  , natural = require('natural');

//var db = new mongodb.Db('plom', new mongodb.Server("127.0.0.1", 27017), {safe:true});
//
//db.open(function (err, client) {
//
//  if (err) throw err;
//  console.log("Connected to mongodb");
//
//  //store ref to the collection so that it is easily accessible (app is accessible in req and res!)
//  var pcontext = new mongodb.Collection(client, 'context')
//    , pprocess = new mongodb.Collection(client, 'process')
//    , plink = new mongodb.Collection(client, 'link')
//    , ptheta = new mongodb.Collection(client, 'theta');
//
//});


console.log(natural.PorterStemmer.tokenizeAndStem('i am waking up to the sounds of chainsaws'));
