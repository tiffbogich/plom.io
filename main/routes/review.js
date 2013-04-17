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



exports.vizbit = function(req, res, next){

  var projection = {vizbit:true, comments: true, _id:false};

  if(typeof req.params.comment_id !== 'undefined'){
    projection.comments = {'$slice': [req.params.comment_id, 1]};
  }

  var r = req.app.get('reviews');
  r.findOne({_id: new ObjectID(req.params.review_id)}, projection, function(err, doc){
    if(err) return next(err);

    if(typeof req.params.comment_id !== 'undefined'){
      res.json(doc.comments[0].vizbit);
    } else {
      res.json(doc.vizbit);
    }

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
      option: (comment.change) ? 'revised_': ((comment.decision) ? 'contested_' + comment.decision : 'commented'),
      review_id: review._id,
      comment_id: review.comments.length-1,
      context_id: review.context_id,
      process_id: review.process_id,
      link_id: review.link_id,
      theta_id: review.theta_id,
      user_id: review.username,
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


exports.postDiscuss = function(req, res, next){

  var type = req.params.type;

  var c = req.app.get('components');
  var d = req.body;
  delete d._csrf;

  d.username = req.session.username;
  d.date = new Date();

  var pg; //parameter and group if type === prior

  var upd = {$push:{}};

  if(type === 'pmodel'){
    upd['$push']['process_model.' + d.discussion_id + '.discussion'] = d;
  } else if (type === 'omodel'){
    upd['$push']['observed.' + d.discussion_id + '.discussion'] = d;
  } else {
    pg = d.discussion_id.split(':');
    upd['$push']['parameter.' + pg[0] + '.group.' + pg[1] + 'prior.discussion'] = d;
  }


  c.findAndModify({_id: new ObjectID(d.theta_id || d.link_id)}, [], upd, {safe:true, 'new':true}, function(err, doc) {
    if (err) return next(err);

    //add event
    var mye = {
      from: req.session.username,
      type: 'discuss_' + type,
      name: d.name,
      discussion_id: d.discussion_id,
      context_id: d.context_id,
      process_id: d.process_id,
      link_id: d.link_id
    };

    if(type === 'prior'){
      mye.theta_id = d.theta_id;
    }

    var e = req.app.get('events');
    e.insert(mye, function(err, docs){
      if(err) return next(err);
    });


    if(type === 'pmodel'){
      res.send(doc.process_model[d.discussion_id].discussion);
    } else if (type === 'omodel'){
      res.send(doc.observed[d.discussion_id].discussion);
    } else {
      res.send(doc.parameter[pg[0]].group[pg[1]].prior.discussion);
    }

  });

};
