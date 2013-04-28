/**
 * custom ejs filters to name reviews, requests and events
 **/

var util = require('util');


exports.event = function(event){

  return event.name || '';
  
}



exports.context = function(context){

  return context.disease.join('; ') + ' / ' + context.name;
  
}

exports.link = function(link){

  return link.context_disease.join('; ') + ' / ' + link.context_name + ' / ' + link.process_name +  '- ' + link.name;
  
}
