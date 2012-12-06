/**
 * add a comment property to the value dictionaries of theta.json
 */

module.exports.describeTheta = function (theta, proc, obs) {

  var all_comments = {};
  ['state', 'parameter'].forEach(function(el){
    proc[el].forEach(function(par){
      all_comments[par.id] = par.comment || '';
    });
  });

  obs.parameter.forEach(function(par){
    all_comments[par.id] = par.comment || '';
  });


  var units = {D:'days', W:'weeks', M:'months', Y:'years'};
  var constraints = {log: '(>0)', logit: '([0,1])'};

  for(var p in theta['value']){

    var c = theta['value'][p]['transformation']  || null;
    var u = theta['value'][p]['unit'] || null;
    var t = theta['value'][p]['type'] || null;

    var unit_string = ''
    , constraint_string = ''
    , comment_string = theta['value'][p]['comment'] || all_comments[p] || '';

    if(u){
      unit_string = (t === 'rate_as_duration') ? ' in ' : ' per ';
      unit_string += units[u];
    }

    if(c){
      constraint_string = constraints[c];
    }

    theta['value'][p]['comment'] = comment_string + ' ' + constraint_string + unit_string;
  }
}
