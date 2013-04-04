var fs = require('fs')
  , check = require('validator').check
  , mongodb = require('mongodb')
  , ObjectID = require('mongodb').ObjectID
  , path = require('path');


exports.theta = function(req, res, next){

  var r = req.app.get('reviews');

  r.find({theta_id: req.params.theta_id}).sort({_id: 1}).toArray(function(err, reviews){
    if(err) return next(err);
    res.send({reviews: reviews, username: req.session.username});
  });

};



exports.postTheta = function(req, res, next){

  var r = req.app.get('reviews');
  var review = req.body;
  delete review._csrf;

  review.username = req.session.username;
  review.date = new Date();

  r.insert(review, function(err, review){
    if(err) return next(err);

    r.find({theta_id: review[0].theta_id}).sort({_id: 1}).toArray(function(err, reviews){
      if(err) return next(err);
      res.send({reviews: reviews, username: req.session.username});
    });

  });

};



exports.postCommentTheta = function(req, res, next){

  var r = req.app.get('reviews');
  var comment = req.body;
  
  var _id = new ObjectID(comment.review_id);
  delete comment.review_id;
  delete comment._csrf;

  comment.username = req.session.username;
  comment.date = new Date();

  var update = {$push: {comments: comment}};
  if(comment.change){
    update['$set'] = {decision: comment.change};
  }

  r.findAndModify({_id:_id},[], update, {safe:true}, function(err, doc){
    if(err) return next(err);

    r.find({theta_id: doc.theta_id}).sort({_id: 1}).toArray(function(err, reviews){
      if(err) return next(err);
      res.send({reviews: reviews, username: req.session.username});
    });

  });

};
