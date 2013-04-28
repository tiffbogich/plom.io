var ObjectID = require('mongodb').ObjectID
  , async = require('async')
  , _ = require('underscore')
  , schecksum = schecksum = require('plom-schecksum');


exports.index = function(req, res, next){

  var components = req.app.get('components')
    , users = req.app.get('users');

  var context_id = req.params.context_id;

  users.findOne({_id: req.session.username}, function(err, user){
    if (err) return next(err);

    components.findOne({_id: new ObjectID(context_id)}, function(err, context){
      if(err) return next(err);
      req.session.context_id = context._id;
      req.session.disease = context.disease;
      req.session.context_name = context.name;

      res.render('requests/index', {context: context, context_followed: user.context_id || []});
    });

  });
 
};


function getRequests(requests, components, session, context_id, type, callback){

  var q = {context_id: context_id};
  if(typeof type !== 'undefined'){
    q.type = type;
  }
  requests.find(q).sort({_id: -1}).toArray(function(err, docs){    
    if(err) return callback(err);

    //get extra info
    if(type !== 'prior'){
      var extras = {};
      if(!type || type === 'results'){
        extras.links = function(cb){components.find({username: session.username, context_id: context_id, type: 'link'}).toArray(cb);};
      }
      if(!type || type === 'fork'){
        extras.contexts = function(cb){components.find({username: session.username, _id: context_id, type: 'context'}).toArray(cb);};
      }
      
      async.series(extras, function(err, extras){
        if (err) return callback(err);
        extras.requests = docs;
        callback(null, extras);
      });
    } else {
      callback(null, {requests: docs});
    }

  });
};

exports.get = function(req, res, next){
  
  var requests = req.app.get('requests')
    , components = req.app.get('components');
    
  var type = req.params.type;
  var context_id = req.session.context_id;

  getRequests(requests, components, req.session, context_id, type, function(err, ctx){
    if (err) return next(err);    
    res.render('requests/threads', ctx);
  });

};


exports.post = function(req, res, next){

  var requests = req.app.get('requests');
  var request = req.body;
  
  if('_csrf' in request){
    delete request._csrf;
  }

  //add session info to request
  request.username = req.session.username;
  request.date = new Date();
  request.disease = req.session.disease;
  request.context_name = req.session.context_name;
  request.context_id = req.session.context_id;

  requests.insert(request, function(err, request){
    if(err) return next(err);

    request = request[0];
    var events = req.app.get('events');

    var name = {
      disease: request.disease,
      context: req.session.context_name
    };
    if('parameter' in request){
      name.parameter = request.parameter; 
    }

    //add event
    var mye = {
      from: req.session.username,
      type: 'request',
      name: name,
      option: request.type,
      request_id: request._id,
      context_id: request.context_id
    };

    events.insert(mye, function(err){
      if(err) return callback(err);
      //retrieve latest requests
      getRequests(requests, req.app.get('components'), req.session, request.context_id, undefined, function(err, ctx){
        if (err) return next(err);    
        res.render('requests/threads', ctx);
      });

    });
  });
};



/**
 * post comments or resolution
 * + if a prior is submitted, fill the db of priors
 */
exports.resolve = function(req, res, next){

  var requests = req.app.get('requests');
  var comment = req.body;

  var _id = comment.request_id;
  delete comment.request_id;
  delete comment._csrf;

  comment.username = req.session.username;
  comment.date = new Date();

  var upd = {$push: {comments: comment}};

  requests.findAndModify({_id: new ObjectID(_id)}, [], upd, {safe:true, 'new':true}, function(err, request){
    if(err) return next(err);

    //commit prior
    if(request.type === 'prior' && 'attachment' in comment){
      var prior = comment.attachment;
      if(prior.unit === 'P' || 'N'){
        delete prior.unit;
      }
      prior.par_type = request.par_type;
      prior.disease = req.session.disease;
      prior.parameter = request.parameter;
      prior.min = parseFloat(comment.attachment.min);
      prior.max = parseFloat(comment.attachment.max);
      prior.posterior = false;
      prior.group_compo = [request.population_id];
      prior.id = schecksum(prior);

      var upd = {
        $set: prior, 
        $addToSet: {
          ids: {context_id: req.session.context_id}, 
          comment: request.description}
      };

      var priors = req.app.get('priors');
      priors.update({id: prior.id}, upd, {upsert:true}, function(err, cnt){
        if(err) console.log(err);
      });
    }

    //log events
    var events = req.app.get('events');

    //add event
    var mye = {
      from: req.session.username,
      type: 'request',
      option: (('attachment' in request) ? 'resolved': 'commented') + '_' + request.type,
      request_id: request._id,
      comment_id: request.comments.length-1,
      name: request.name,
      context_id: request.context_id,
      username: request.username
    };
    
    events.insert(mye, function(err){
      if(err) return callback(err);
      //retrieve latest requests
      getRequests(requests, req.app.get('components'), req.session, request.context_id, undefined, function(err, ctx){
        if (err) return next(err);    
        res.render('requests/threads', ctx);
      });

    });

  });

};
