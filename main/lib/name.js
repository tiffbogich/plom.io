/**
 * custom ejs filters to name reviews, requests and events
 **/


exports.request = function(x){

  return x.name || x.title || '';
  
}

exports.context = function(x){

  return x.name || '';
  
}

exports.link = function(x){

  return x.name || '';
  
}
