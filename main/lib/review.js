var ObjectID = require('mongodb').ObjectID;

/**
 * retrieve reviews and returns a review hash with semantic_id as keys
 * l is a list or undefined (for theta) if l is a list it comes from
 * either process.model, link.prior, theta.posterior or link.observed
 */

exports.get = function(collection, l, model, callback){

  var q, id_key;

  if(!l){
    q = {
      type: 'theta',
      link_id: model.link._id.toString(),
      theta_id: model.theta._id.toString()
    };
  } else if('rate' in l[0]){
    //model is discussed at the disease level
    q = {
      type: 'reaction', 
      disease: {'$all': model.disease, '$size': model.disease.length},
      process_id: model.process._id,
    };
    id_key = 'reaction_id';
  } else if ('definition' in l[0]){
    q = {
      type: 'observed',
      link_id: model.link._id,
      reaction_id: {$in: l.map(function(x){return x.id;})}
    };
    id_key = 'observed_id';
  } else if ('posterior' in l[0] && l[0].posterior){
    q = {
      type: 'posterior',
      link_id: model.link._id,
      prior_id: {$in: l.map(function(x){return x.semantic_id;})}
    };
    id_key = 'prior_id';
  } else if ('posterior' in l[0] && !l[0].posterior){
    //prior is discussed at the context level
    q = {
      type: 'prior',
      context_id: model.context._id,
      prior_id: {$in: l.map(function(x){return x.semantic_id;})}
    };
    id_key = 'prior_id';
  }
  
  collection.find(q).sort({_id:1}).toArray(function(err, reviews){

    if(err) return callback(err);
    if(q.type === 'theta'){
      return callback(null, reviews);
    } else {
      //make an object with id_key as keys
      var reviewsObj = {};
      reviews.forEach(function(r){
        reviewsObj[r[id_key]] = r;
      });      
      return callback(null, reviewsObj);
    }        
  });
};


/**
 * insert a review, log event and retrieve latest reviews
 */
exports.post = function(collection, events, review, username, callback){

  if('_csrf' in review){
    delete review._csrf;
  }

  review.username = username;
  review.date = new Date();


  collection.insert(review, function(err, review){
    if(err) return callback(err);

    review = review[0];

    //add event
    var mye = {
      from: username,
      type: review.type,
      name: review.name,
      option: review.decision,
      review_id: review._id
    };

    //add all _id
    ['context_id', 'process_id', 'link_id', 'theta_id', 'prior_id', 'reaction_id', 'observed_id'].forEach(function(id){
      if(id in review){
        mye[id] = review[id];
      }
    });

    events.insert(mye, function(err){
      if(err) return callback(err);
      //retrieve latest reviews
      update(collection, review, callback);
    });

  });

}

/**
 * retrieve latest reviews for review
 */
function update(collection, review, callback){

  var q;
  var type = review.type;
  if(type === 'theta'){
    q = {
      link_id: review.link_id,
      theta_id: review.theta_id
    };
  } else if(type === 'prior') {
    q = { //prior is discussed at the context level
      context_id: review.context_id,
      prior_id: review.prior_id
    };    
  } else if(type === 'posterior') {
    q = {
      link_id: review.link_id,
      prior_id: review.prior_id
    };    
  } else if(type === 'reaction') {
    q = { //model is discussed at the disease level
      disease: {'$all': review.disease, '$size': review.disease.length},
      process_id: review.process_id,
      reaction_id: review.reaction_id
    };
  } else if(type === 'observed') {
    q =  { 
      link_id: review.link_id,
      reaction_id: review.reaction_id
    };
  }
  
  q.type = type;

  //retrieve latest reviews
  collection.find(q).sort({_id: 1}).toArray(callback);

}


/**
 * push a comment to a review
 */

exports.comment = function(collection, events, comment, username, callback){

  var _id = new ObjectID(comment.review_id);
  delete comment.review_id;
  delete comment._csrf;

  comment.username = username;
  comment.date = new Date();

  var update = {$push: {comments: comment}};
  if(comment.change){
    update['$set'] = {decision: comment.change};
  }

  r.findAndModify({_id:_id}, [], update, {safe:true, 'new':true}, function(err, review){
    if(err) return next(err);

    //add event
    var mye = {
      from: username,
      type: 'review',
      option: (comment.change) ? 'revised_': ((comment.decision) ? 'contested_' + comment.decision : 'commented'),
      review_id: review._id,
      comment_id: review.comments.length-1,
      name: review.name
    };

    //add all _id
    ['username', 'context_id', 'process_id', 'link_id', 'theta_id', 'prior_id', 'reaction_id', 'observed_id'].forEach(function(id){
      if(id in review){
        mye[id] = review[id];
      }
    });
    
    events.insert(mye, function(err){
      if(err) return callback(err);
      //retrieve latest reviews
      update(collection, review, callback);
    });

  });

};
