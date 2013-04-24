/**
 * retrieve reviews and returns a review hash with semantic_id as keys
 * l is a list or undefined (for theta) if l is a list it comes from
 * either process.model, link.prior, theta.posterior or link.observed
 */

exports.get = function(collection, l, model, callback){

  var q = {
    'theta': {
      link_id: model.link._id,
      theta_id: model.theta._id
    },
    'reaction': { //model is discussed at the disease level
      disease: {'$all': model.disease, '$size': model.disease.length},
      process_id: model.process._id,
    },
    'prior': { //prior is discussed at the context level
      context_id: model.context._id,
      prior_id: {$in: ids}
    },
    'posterior': {
      link_id: model.link._id,
      prior_id: {$in: ids}
    },
    'observed': { 
      link._id: model.link._id,
      reaction._id: {$in: ids}
    }
  }

  for(var type in q){
    q.type = type;
  }

  var type, ids, id_key;
  if(!l){
    type = 'theta';
  } else if('rate' in l[0]){
    type = 'reaction';
    id_key = 'reaction_id';
  } else if ('definition' in l[0]){
    type = 'observed';
    id_key = 'observed_id';
    ids = l.map(function(x){return x.id;});
  } else if ('posterior' in l[0] && l[0].posterior){
    type = 'posterior';
    id_key = 'prior_id';
    ids = l.map(function(x){return x.semantic_id;});
  } else if ('posterior' in l[0] && !l[0].posterior){
    type = 'prior';
    id_key = 'prior_id';
    ids = l.map(function(x){return x.semantic_id;});
  }
  
  collection.find(q).sort({_id:1}).toArray(function(err, reviews){

    if(err) return callback(err);
    if(type === 'theta'){
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

  if('_csrf' in comment){
    delete comment._csrf;
  }

  review.username = req.session.username;
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
      
      var q = {
        'theta': {
          link_id: review.link_id,
          theta_id: review.theta_id
        },
        'prior': { //prior is discussed at the context level
          context_id: review.context_id,
          prior_id: review.prior_id
        },
        'posterior': {
          link_id: review.link_id,
          prior_id: review.prior_id
        },
        'reaction': { //model is discussed at the disease level
          disease: {'$all': review.disease, '$size': review.disease.length},
          process_id: review.process_id,
          reaction_id: review.reaction_id
        },
        'observed': { 
          link_id: review.link_id,
          reaction_id: review.reaction_id
        }
      }
      
      for(var type in q){
        q.type = type;
      }

      //retrieve latest reviews
      collection.find(q).sort({_id: 1}).toArray(callback);
    });

  });

}
