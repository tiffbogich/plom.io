/**
 * add a comment property to the parameter dictionaries of theta.json
 */

module.exports.describeTheta = function (theta, proc, link) {

  var all_comments = {};
  ['state', 'parameter'].forEach(function(el){
    proc[el].forEach(function(par){
      all_comments[par.id] = par.comment || '';
    });
  });

  link.parameter.forEach(function(par){
    all_comments[par.id] = par.comment || '';
  });


  var units = {D:'days', W:'weeks', M:'months', Y:'years'};
  var constraints = {log: '(>0)', logit: '([0,1])'};

  for(var p in theta['parameter']){

    var c = theta['parameter'][p]['transformation']  || null;
    var u = theta['parameter'][p]['unit'] || null;
    var t = theta['parameter'][p]['type'] || null;

    var unit_string = ''
      , constraint_string = ''
      , comment_string = theta['parameter'][p]['comment'] || all_comments[p] || '';

    if(u){
      unit_string = (t === 'rate_as_duration') ? ' in ' : ' per ';
      unit_string += units[u];
    }

    if(c){
      constraint_string = constraints[c];
    }

    theta['parameter'][p]['comment'] = comment_string + ' ' + constraint_string + unit_string;
  }
}
