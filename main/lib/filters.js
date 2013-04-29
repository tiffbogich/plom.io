/**
 * custom ejs filters
 **/

var util = require('util')
  , querystring = require('querystring');

var croot = '/library?'
  , lroot = '/review?';

exports.add = function(ejs){
  //names
  ejs.filters.nameContext = function(context){ return context.disease.join('; ') + ' / ' + context.name; };
  ejs.filters.nameLink = function(link){ return link.context_disease.join('; ') + ' / ' + link.context_name + ' / ' + link.process_name +  '- ' + link.name; };
  

  //links
  ejs.filters.dhref = function(context){ return croot + querystring.stringify({d: context.disease || context.context_disease || context}); }; //works for interest to
  ejs.filters.chref = function(context){ return croot + querystring.stringify({d: context.disease, c: context.name || context.context_name }); }; //works for events and models too
  ejs.filters.lhref = function(link){ return lroot + (link._id || link.link_id); }; //works for events and models too

  //labels
  ejs.filters.elabel = function(event){ 
    var labels = {
      library: 'label label-important',
      follow: 'label label-success',
      request: 'label',
      review: 'label label-info'
    }

    return labels[event.category]; 
  };


}




