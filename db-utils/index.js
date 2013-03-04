var _ = require('underscore')
   , natural = require('natural');

/**
 * returns a mongo query object efficient to  match the user search string searchString
 */

exports.querify = function(searchString){

  var qstemmed = natural.PorterStemmer.tokenizeAndStem(searchString);

  //mongo query object
  return {$or: [{name: searchString}, {_keywords: {$in: qstemmed } }], type: 'link'};
}


/**
 * returns a keywords array is made from stem of doc.name, doc.disease and doc.description
 */
exports.addKeywords = function(component){

  //name is a mandatory property of component, description is not
  var keywords = natural.PorterStemmer.tokenizeAndStem(component.name);

  if('disease' in component && component.disease.length){
    keywords = _.unique(keywords.concat(component.disease));
  }

  if('description' in component && component.description){
    keywords = _.unique(keywords.concat(natural.PorterStemmer.tokenizeAndStem(component.description)));
  }

  return keywords
}

