var fs = require('fs')
  , check = require('validator').check
  , mongodb = require('mongodb')
  , ObjectID = require('mongodb').ObjectID
  , path = require('path');


exports.user = function(req, res, next){

  var u = req.app.get('users');

  u.findOne({_id: req.params.username}, function(err, user){
    if(err) return next(err);

    //get events
    var e = req.app.get('events');
    var q = {
      $or: [
        {from: req.session.username},
        {user_id: req.session.username},
        {context_id: {$in: user.context_id}},
        {user_id: {$in: user.user_id}},
      ]};

    e.find(q).sort({_id:-1}).toArray(function(err, events){
      if(err) return next(err);

      res.render('user', {user: user, events: events});
    });

  });
};


/**
 * Follow/Unfollow user or context depending on the URL
 */
exports.postFollow = function(req, res, next){

  var u = req.app.get('users');

  var update = {}
    , key = (req.body.action === 'follow') ? '$addToSet' : '$pull'
    , what = (req.route.path.indexOf('context') === -1) ? 'user' : 'context';

  update[key] = (what === 'user') ? {user_id: req.body.user_id}: {context_id: req.body.context_id};

  u.update({_id: req.session.username}, update, {safe:true}, function(err){
    if(err) {
      res.send({success: false, error:err});     
    } else {
      res.send({success: true});

      //insert event
      var mye = {
        from: req.session.username,
        type: req.body.action + '_' + what
      };

      if(what === 'context'){
        mye.context_id = req.body.context_id;
        mye.name = req.body.name;
      } else {
        mye.user_id = req.body.user_id;
      }

      var e = req.app.get('events');
      e.insert(mye, function(err, docs){
        if(err) return next(err);
      });
    }
  });

};
