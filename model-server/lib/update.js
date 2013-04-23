//update components

exports.link = function(collection, comps, callback){

  var linkUpdate = {
    $set: {
      context_id: comps.context._id,
      context_disease: comps.context.disease,
      context_name: comps.context.name,
      process_id: comps.process._id,
      process_name: comps.process.name,
    },
    $addToSet: {_keywords: {$each :comps.context._keywords.concat(comps.process._keywords)}}
  };

  collection.update({_id: comps.link._id}, linkUpdate, {safe:true}, callback);

};


exports.theta = function(collection, comps, callback){

  var thetaUpdate = {
    $set: {
      context_id: comps.context._id,
      context_disease: comps.context.disease,
      context_name: comps.context.name,
      process_id: comps.process._id,
      process_name: comps.process.name,
      link_id: comps.link._id,
      link_name: comps.link.name
    }
  };

  collection.update({_id: comps.theta._id}, thetaUpdate, {safe:true}, function(err, cntTheta){
    if(err) return callback(err);

    var linkUpdate = {
      $push: {theta_id: comps.theta._id}
    };
    
    collection.update({_id: comps.link._id}, linkUpdate, {safe:true}, function(err, cntLink){
      callback(err, {theta:cntTheta, link: cntLink});
    });

  });

};
