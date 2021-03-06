var _ = require('underscore')
  , natural = require('natural');

/**
 * returns a mongo query object efficient to match the user search string searchString
 */

exports.querify = function(searchString, disease){

  if(!Array.isArray(disease) && typeof disease === 'string' && disease){
    disease = [disease];
  }

  var qobj = {type: 'link'};

  if(disease && disease.length){
    qobj['context_disease'] = {$all: disease, $size: disease.length};
  }
  
  if(searchString){
    var qstemmed = natural.PorterStemmer.tokenizeAndStem(searchString);

    //mongo query object
    qobj['$or'] =  [
      {name: searchString},
      {_keywords: {$in: qstemmed } }
    ];   
  }

  return qobj;
}


/**
 * returns a keywords array is made from stem of doc.name, doc.disease and doc.description
 */
exports.addKeywords = function(component){

  //name is a mandatory property of component, description is not
  var keywords = natural.PorterStemmer.tokenizeAndStem(component.name);

  if('disease' in component && component.disease.length){
    keywords = _.unique(keywords.concat(_.flatten(component.disease.map(natural.PorterStemmer.tokenizeAndStem))));
  }

  if('description' in component && component.description){
    keywords = _.unique(keywords.concat(natural.PorterStemmer.tokenizeAndStem(component.description)));
  }

  return keywords
}
