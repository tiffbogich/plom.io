var fs = require('fs')
  , check = require('validator').check
  , mongodb = require('mongodb')
  , ObjectID = require('mongodb').ObjectID
  , path = require('path')
  , async = require('async')
  , _ = require('underscore');

exports.feedbacktheta_post = function(req, res, next){

  var f = req.app.get('feedback');
  var review = req.body;

  f.insert(review, function(err, review){
    if(err) return next(err);

    f.find({theta_id: review[0].theta_id}).sort({_id:1}).toArray(function(err, reviews){
      if(err) return next(err);
      res.send(reviews);
    });

  });

};
