var async = require('async')
  , ObjectID = require('mongodb').ObjectID;

///////////
// stats //
///////////

//add stats (number of accepted and rejected)
exports.stats = function(collection, model, callback){

  //building mongo aggregate pipeline for each model component that stats review
  var match = {
    reaction: {type: 'reaction', disease: {'$all': model.context.disease, '$size': model.context.disease.length}, process_id: model.process._id},
    observed: {type: 'observed', link_id: model.link._id, id: {$in: model.link.observed.map(function(x){return x.id;})}},
    posterior: {type: 'posterior', link_id: model.link._id, id: {$in: model.best.posterior.map(function(x){return x.semantic_id;})}},
    prior: {type: 'prior', context_id: model.context._id, id: {$in: model.link.prior.map(function(x){return x.semantic_id;})}}
  };

  var group = {
    $group: {
      _id: { id : "$id", status : "$status" },
      nb: { $sum : 1 } 
    } 
  };

  var tasks = {};
  for(var t in match){
    tasks[t] = (function(t){
      return function(callback){
        collection.aggregate([{$match: match[t]}, group], callback);                    
      };
    })(t);
  }
  
  async.parallel(tasks, function(err, stats){
    if(err) return callback(err);

    //add stats to model    
    function statify(stat){
      //stat is an array of the form {_id: {id:, status:}, nb: }
      //we make an object of the form id:{accepted:nb, rejected:nb} so that it's easy to plug to model'

      var obj = {};
      stat.forEach(function(s){
        if(!(s._id.id in obj)){
          obj[s._id.id] = {};
        }
        obj[s._id.id][s._id.status] = s.nb;
      });      

      return obj;
    };

    function merge(l, statObj){
      //l is a list, statObj the result of statify
      l.forEach(function(x){
        l.stats = statObj[x.id];
      });      
    };

    merge(model.process.model, statify(stats.reaction));
    merge(model.link.observed, statify(stats.observed));
    merge(model.link.prior, statify(stats.prior));
    merge(model.best.posterior, statify(stats.posterior));

    callback(null, model);
  });

};


//////////////
// retrieve //
//////////////
exports.get = function(collection, session, params, callback){

  var type = params.type
    , id = params.id;
  
  var q = {
    type: type,
    id: (type === 'reaction') ? parseInt(id, 10) : id
  };

  if(type === 'theta'){
    q.link_id =  session.link_id;
  } else if(type === 'prior') {
    q.context_id = session.context_id;
  } else if(type === 'posterior') {
    q.link_id = session.link_id;
  } else if(type === 'reaction') {
    q.disease = {'$all': session.disease, '$size': session.disease.length};
    q.process_id = session.process_id;
  } else if(type === 'observed') {
    q.link_id = session.link_id;
  } 

  //retrieve latest reviews
  collection.find(q).sort({_id: 1}).toArray(callback);
};



////////////
// insert //
////////////

/**
 * insert a review, log event and retrieve latest reviews
 */
exports.post = function(collection, events, session, review, callback){

  if('_csrf' in review){
    delete review._csrf;
  }

  //add session info to review
  review.username = session.username;
  review.date = new Date();

  review.name = {
    disease: session.disease,
    context: session.context_name,
    process: session.process_name,
    link: session.link_name
  };

  if('parameter' in review){   
    review.name.parameter = review.parameter;
    delete review.parameter;
  }
  if('group' in review){   
    review.name.group = review.group;
    delete review.group;
  }

  review.disease = session.disease;
  review.context_id = session.context_id;
  review.process_id = session.process_id;
  review.link_id = session.link_id;

  review.id = (review.type === 'reaction') ? parseInt(review.id, 10) : review.id;

  collection.insert(review, function(err, review){
    if(err) return callback(err);

    review = review[0];

    //add event
    var mye = {
      from: session.username,
      type: review.type,
      name: review.name,
      option: review.status,
      review_id: review._id
    };

    //add all _id
    ['context_id', 'process_id', 'link_id', 'id'].forEach(function(id){
      if(id in review){
        mye[id] = review[id];
      }
    });

    events.insert(mye, function(err){
      if(err) return callback(err);
      //retrieve latest reviews
      exports.get(collection, session, review, callback);
    });

  });

}


/**
 * push a comment to a review
 */

exports.comment = function(collection, events, session, comment, callback){

  var _id = new ObjectID(comment.review_id);
  delete comment.review_id;
  delete comment._csrf;

  comment.username = session.username;
  comment.date = new Date();

  var upd = {$push: {comments: comment}};
  if(comment.change){
    upd['$set'] = {status: comment.change};
  }

  collection.findAndModify({_id:_id}, [], upd, {safe:true, 'new':true}, function(err, review){
    if(err) return next(err);

    //add event
    var mye = {
      from: session.username,
      type: 'review',
      option: (comment.change) ? 'revised_': ((comment.status) ? 'contested_' + comment.status : 'commented'),
      review_id: review._id,
      comment_id: review.comments.length-1,
      name: review.name
    };

    //add all _id
    ['username', 'context_id', 'process_id', 'link_id', 'id'].forEach(function(id){
      if(id in review){
        mye[id] = review[id];
      }
    });
    
    events.insert(mye, function(err){
      if(err) return callback(err);
      //retrieve latest reviews
      exports.get(collection, session, review, callback);
    });

  });

};
