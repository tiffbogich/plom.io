//log events

/**
 * context creation
 */
exports.context = function (collection, comps, user, callback){

  collection.insert({
    from: user,
    category: 'library',
    type: 'context',
    verb: 'added',
    context_id: comps.context._id,
    disease: comps.context.disease,
    context_name: comps.context.name      
  }, callback);

};


/** 
 * model (i.e link) creation 
 */
exports.link = function(collection, comps, user, callback){

  collection.insert({
    from: user,
    verb: 'added',
    category: 'library',
    type: 'model',
    context_id: comps.context._id,
    process_id: comps.process._id,
    link_id: comps.link._id,
    disease: comps.context.disease,
    context_name: comps.context.name,
    process_name: comps.process.name,
    link_name: comps.link.name
  }, callback);

};

/** 
 * theta creation 
 */
exports.theta = function(collection, comps, user, callback){

  collection.insert({
    from: user,
    verb: 'added',
    category: 'library',
    type: 'results',
    context_id: comps.context._id,
    process_id: comps.process._id,
    link_id: comps.link._id,
    theta_id: comps.theta._id,
    disease: comps.context.disease,
    context_name: comps.context.name,
    process_name: comps.process.name,
    link_name: comps.link.name
  }, callback);

};
