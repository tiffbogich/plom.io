var mongodb = require('mongodb')
, _ = require('underscore')
, natural = require('natural')
, ObjectID = require('mongodb').ObjectID;


exports.PlomComponents = PlomComponents;
exports.PlomTrees = PlomTrees;

/**
 * Handles context.json, process.json, link.json, theta.json, design.json
 * components a mongodb collection
 */

function PlomComponents(components){
  this.components = components;
}


/**
 * returns a cursor to a list of component matching the user search string q
 */
PlomComponents.prototype.findComponents = function(q, options){

  options = options || {};

  //stem query
  var qstemmed = natural.PorterStemmer.tokenizeAndStem(q);

  //mongo query object
  var qobj = {$or: [{name: q}, {name: {$in: qstemmed } }, {_keywords: {$in: qstemmed } }]};

  var cursor = this.components.find(qobj, options);

  return cursor;
}

/**
 * Adds /replace  doc._keywords array in place .
 * _keywords is made from stem of doc.name and doc.description
 */
PlomComponents.prototype.add_keywords = function(doc){

  //name is a mandatory property of doc, description is not
  doc._keywords = natural.PorterStemmer.tokenizeAndStem(doc.name);

  if('disease' in doc && doc.disease.length){
    doc._keywords = _.unique(doc._keywords.concat(doc.disease));
  }

  if('description' in doc && doc.description){
    doc._keywords = _.unique(doc._keywords.concat(natural.PorterStemmer.tokenizeAndStem(doc.description)));
  }
}



/**
 * Handles tree.json (extends PlomComponents)
 * components a mongodb collection
 * trees a mongodb collection
 */

function PlomTrees(components, trees){

  PlomComponents.call(this, components);
  this.trees = trees;
}

PlomTrees.prototype = Object.create(PlomComponents.prototype);
PlomTrees.prototype.constructor = PlomTrees;



/**
 * execute callback(err, cursor) on matching trees
 * q a user query string
 */
PlomTrees.prototype.search = function(q, callback){

  var trees = this.trees;
  var cursorComponents = this.findComponents(q, {fields: {_id: 1}}); //limit results to _id

  cursorComponents.toArray(function(err, docs) {
    if(err) return callback(err);

    var qobj = {"node._id": {$in : docs.map(function(x){ return x["_id"];})}};

    var cursor = trees.find(qobj);
    callback(err, cursor);
  });
}


/**
 * Initial insertion of a component (i.e not in a tree)
 * if component.type === 'context', create the associated disease tree (if it doesn't exists already')
 * component has to be of type context or process. theta and link have to be inserted in a tree with insertComponentAt

 * callback, callback(err, inserted_component) called after the **final** insertion (i.e after tree created in case of context). In any case inserted component if the component, not the tree!
 */

PlomTrees.prototype.insertComponent = function(component, callback){
  var that = this;

  this.add_keywords(component);
  this.components.insert(component, {safe:true}, function(err, docs){

    if(err) return callback(err);

    if (component.type === 'context') {

      that.trees.findOne({disease: {$all: component.disease}}, {fields:{_id:1, node:1}}, function(err, doc){

        if(err) return callback(err);

        var node = {'name': component.name,
                    'type': component.type,
                    'parent_id': null,
                    '_id': docs[0]['_id']};

        if(!doc) { //if tree doen't exists
          that.trees.insert({disease: component.disease, node:[node]}, {safe:true}, function(err, objs){
            if(err) return callback(err);
            callback(err, docs[0]);
          });
        } else { //a tree already exists, we attach context a the root (the first object of node array by construction)
          node.parent_id = doc.node[0]['_id'];
          that.trees.update({_id: doc._id}, {$addToSet: {node: node}}, {safe:true}, function(err){
            if(err) return callback(err);
            callback(err, docs[0]);
          });
        };
      });

    } else {
      callback(err, docs[0]);
    }

  });

}



/**
 * Insert a component in a tree.
 * If the component is not present in the components collection (i.e if it doen't have an _id'), it is added.
 * We assume that it has been checked that the tree_idString is correct...

 * callback, callback(err, inserted_component)
 */

PlomTrees.prototype.insertComponentAt = function(component, tree_idString , parent_idString, callback){

  var trees= this.trees
    , components = this.components
    , that = this;

  //map parent (level1) child (level2)
  var is_good = {'context': {'context': true,
                             'process': true,
                             'link': false,
                             'theta':false},
                 'process': {'context': false,
                             'process': true,
                             'link': true,
                             'theta':false},
                 'link': {'context': false,
                          'process': false,
                          'link': true,
                          'theta':true},
                 'theta': {'context': false,
                           'process': false,
                           'link': false,
                           'theta':true},
                 'design': {'context': false,
                            'process': false,
                            'link': false,
                            'theta':false}
                };


  //retrieve parent
  this.components.findOne({_id:new ObjectID(parent_idString)}, function(err, parent){

    if(err) return callback(err);

    if(parent){
      if (is_good[parent.type][component.type]){

        var node = {'name': component.name,
                    'type': component.type,
                    'parent_id': new ObjectID(parent_idString)};

        if('_id' in component) {

          //be safe: check if the component is present
          components.findOne({_id: component['_id']}, {fields:{_id:1}}, function(err, doc){
            if(err) return callback(err);

            if(doc){
              node['_id'] = component['_id'];
              trees.update({_id: new ObjectID(tree_idString)}, {$addToSet: {node: node}}, {safe:true}, function(err){
                if(err) return callback(err);
                callback(err, doc);
              });
            }

          });


        } else {

          //add the component into the components collection AND insert in the tree
          that.add_keywords(component);
          components.insert(component, {safe:true}, function(err, docs){
            if(err) return callback(err);

            if(docs.length){
              node['_id'] = docs[0]['_id'];
              trees.update({_id: new ObjectID(tree_idString)}, {$addToSet: {node: node}}, {safe:true}, function(err){
                if(err) return callback(err);
                callback(err, docs[0]);
              });
            }

          });

        }

      } else {
        return callback(new Error('invalid insertion'));
      } //end if is_good

    } //end if parent

  });

}
