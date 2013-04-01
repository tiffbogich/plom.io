var fs = require('fs')
  , check = require('validator').check
  , mongodb = require('mongodb')
  , ObjectID = require('mongodb').ObjectID
  , path = require('path')
  , async = require('async')
  , _ = require('underscore');

exports.feedbacktheta_post = function(req, res, next){
  
//  var f = req.app.get('feedback');
//
//  f.insert({}, function(err, docs){
//    
//
//    f.find().toArray(function(){
//      
//      .map(function())
//    })
//
//  });

  console.log(req.body);

  res.send({success:true});

};
