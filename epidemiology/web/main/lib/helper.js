/**
 * add a comment property to the parameters dictionaries of settings.json
 */

module.exports.describePar = function (settings) {

  var units = {D:'days', W:'weeks', M:'months', Y:'years'};
  var constraints = {log: '(>0)', logit: '([0,1])'};

  for(var p in settings['parameters']){

    var c = settings['parameters'][p]['transformation']  || null;
    var u = settings['parameters'][p]['unit'] || null;
    var t = settings['parameters'][p]['type'] || null;

    var unit_string = ''
    , constraint_string = ''
    , comment_string = settings['parameters'][p]['comment'] || '';

    if(u){
      unit_string = (t === 'rate_as_duration') ? 'in ' : 'per ';
      unit_string += units[u];
    }

    if(c){
      constraint_string = constraints[c];
    }

    settings['parameters'][p]['comment'] = comment_string + ' ' + constraint_string + ' ' + unit_string;
  }
}
