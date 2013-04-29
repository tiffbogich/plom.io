var fs = require('fs')
  , check = require('validator').check
  , async = require('async')
  , mongodb = require('mongodb')
  , ObjectID = require('mongodb').ObjectID
  , path = require('path');

/**
 * Get the user events and components
 */
exports.user = function(req, res, next){

  var u = req.app.get('users');
  var username = req.params.username;

  u.findOne({_id: username}, function(err, user){
    if(err) return next(err);
    if(!user) return next();

    var e = req.app.get('events')
      , c = req.app.get('components')
      , r = req.app.get('reviews');

    async.parallel({

      events: function(callback){
        var q = {
          $or: [
            {from: username},
            {user_id: username}
          ]};

        if(user.context_id && user.context_id.length){
          q['$or']['context_id'] = {$in: user.context_id};
        }
        if(user.user_id && user.user_id.length){
          q['$or']['user_id'] = {$in: user.user_id};
        }

        e.find(q).sort({_id:-1}).toArray(function(err, docs){
          if(err) return callback(err);
          callback(null, docs);
        });
      },

      contexts: function(callback){
        c.find({type:'context', username: req.session.username}, {disease:true, name:true, _id:true}).sort({_id:-1}).toArray(function(err, docs){
          if(err) return callback(err);
          callback(null, docs);
        });
      },

      models: function(callback){
        c.find({type:'link', username: req.session.username}, {context_disease:true, context_name:true, process_name:true, name:true, _id:true}).sort({_id:-1}).toArray(function(err, docs){
          if(err) return callback(err);
          callback(null, docs);
        });
      },

      thetas: function(callback){
        c.find({type:'theta', username: req.session.username}, {context_disease:true, context_name:true, process_name:true, link_name:true, name:true, _id:true, link_id:true}).sort({_id:-1}).toArray(function(err, docs){
          if(err) return callback(err);
          callback(null, docs);
        });
      },

      reviews: function(callback){
        r.find({username: req.session.username}).sort({_id:-1}).toArray(function(err, docs){
          if(err) return callback(err);
          callback(null, docs);
        });
      }
      
    },

                   function(err, results) {
                     results.user = user;                     
                     res.render('user', results);                    
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
    , what = req.params.what;

  update[key] = (what === 'user') ? {user_id: req.body.user_id}: {context_id: req.session.context_id};

  u.update({_id: req.session.username}, update, {safe:true}, function(err){
    if(err) {
      res.send({success: false, error:err});     
    } else {
      res.send({success: true});

      //insert event
      var mye = {
        from: req.session.username,
        type: req.body.action,
        option: what
      };

      if(what === 'context'){
        mye.context_id = req.session.context_id;
        mye.name =  {
          disease: req.session.disease,
          context: req.session.context_name
        };
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
