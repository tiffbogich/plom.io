/**
 * Extract priors (array of par_proc par_obs par_sv sorted in alphabetical order)
 * model.context
 * model.process
 * model.link
 * model.theta
 */

module.exports = function (model){
  
  var priors = [];

  var par_proc = model.process.parameter.map(function(x){return x.id;}).sort()
    , par_obs = model.link.observation[0].parameter.map(function(x){return x.id;}).sort()
    , par_sv = model.process.state.map(function(x){return x.id;}).sort();
 
  [
    {type:'process', val:par_proc},
    {type:'observation', val:par_obs},
    {type:'state', val:par_sv}
  ].forEach(function(obj){
    
    obj.val.forEach(function(par){
      if(par in model.theta.parameter){
        var groups = Object.keys(model.theta.parameter[par]['group']).sort();
        var pid = model.theta.parameter[par]['partition_id'];

        groups.forEach(function(group){
          var pop_id = model.theta['partition'][pid]['group']
            .filter(function(x){return x.id === group})[0][(obj.type==='observation')? 'time_series_id' :'population_id']
            .sort();

          var p = model.theta.parameter[par];

          var prior = {
            parameter: par,
            group: group,
            group_compo: pop_id.map(function(x){
              var s = x.split('__');              
              return {city: s[0], age: s[1]};
            }),
            disease: model.context.disease.sort(),
            type: obj.type,
            min: p.group[group].min.value,
            max: p.group[group].max.value,
            distribution: p.group[group].prior.value,
            transformation: p.transformation
          }
          
          if ('unit' in p){prior.unit = p.unit;}
          if ('type' in p){prior.type = p.type;}

          priors.push(prior);

        });
      }
    });
    
  });
  

  return priors;
}
