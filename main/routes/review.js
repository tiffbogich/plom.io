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

    //add event
    var mye = {
      from: req.session.username,
      type: 'review',
      name: review[0].name,
      option: review[0].decision,
      review_id: review[0]._id,
      context_id: review[0].context_id,
      process_id: review[0].process_id,
      link_id: review[0].link_id,
      theta_id: review[0].theta_id
    };

    var e = req.app.get('events');
    e.insert(mye, function(err, docs){
      if(err) return next(err);
    });

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

  r.findAndModify({_id:_id},[], update, {safe:true, 'new':true}, function(err, review){
    if(err) return next(err);

    //add event
    var mye = {
      from: req.session.username,
      type: 'review',
      option: (comment.change) ? (((review.username === req.session.username) ? 'revised_': 'contested_') + comment.change) : 'commented',
      review_id: review._id,
      comment_id: review.comments.length-1,
      context_id: review.context_id,
      process_id: review.process_id,
      link_id: review.link_id,
      theta_id: review.theta_id,
      name: review.name
    };

    var e = req.app.get('events');
    e.insert(mye, function(err, docs){
      if(err) return next(err);
    });

    r.find({theta_id: review.theta_id}).sort({_id: 1}).toArray(function(err, reviews){
      if(err) return next(err);
      res.send({reviews: reviews, username: req.session.username});
    });
    
  });

};
