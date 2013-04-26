var ObjectID = require('mongodb').ObjectID
  , async = require('async')
  , _ = require('underscore');


exports.index = function(req, res, next){

  var components = req.app.get('components')
    , users = req.app.get('users');

  var context_id = req.params.context_id;


  users.findOne({_id: req.session.username}, function(err, user){
    if (err) return next(err);

    components.findOne({_id: new ObjectID(context_id)}, function(err, context){
      if(err) return next(err);
      res.render('requests/index', {context: context, context_followed: user.context_id || []});
    });

  });

  

}
