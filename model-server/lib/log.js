//log events

/**
 * context creation
 */
exports.context = function (collection, comps, user, callback){

  collection.insert({
    from: user,
    type: 'create',
    option: 'context',
    context_id: comps.context._id,
    name: {
      disease: comps.context.disease,
      context: comps.context.name      
    }
  }, callback);

};


/** 
 * model (i.e link) creation 
 */
exports.link = function(collection, comps, user, callback){

  collection.insert({
    from: user,
    type: 'create',
    option: 'model',
    context_id: comps.context._id,
    process_id: comps.process._id,
    link_id: comps.link._id,
    name: {
      disease: comps.context.disease,
      context: comps.context.name,
      process: comps.process.name,
      link: comps.link.name
    }
  }, callback);

};

/** 
 * theta creation 
 */
exports.theta = function(collection, comps, user, callback){

  collection.insert({
    from: user,
    type: 'create',
    option: 'theta',
    context_id: comps.context._id,
    process_id: comps.process._id,
    link_id: comps.link._id,
    theta_id: comps.theta._id,
    name: {
      disease: comps.context.disease,
      context: comps.context.name,
      process: comps.process.name,
      link: comps.link.name
    }
  }, callback);

};
