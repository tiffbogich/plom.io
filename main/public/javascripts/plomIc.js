//////////////////////////////////////////////////////////////////////////////
//PlomIc
//////////////////////////////////////////////////////////////////////////////
function PlomIc(plomSettings, theta) {

  this.theta = theta;
  this.plomSettings = plomSettings; //just a ref
  this.N_CAC = plomSettings.cst.N_C*plomSettings.cst.N_AC;
  this.N_PAR_SV = plomSettings.cst.N_PAR_SV;

}


PlomIc.prototype.processMsg = function(msg, appendLog) {
  switch(msg.flag){

  case 'log':
    appendLog(msg.msg, false);
    break;

  case 'err':
    appendLog(msg.msg, true);
    break;

  case 'hat':
    this.process_hat_and_update_UI(msg.msg);
    break;
  }
};



/**
 * Update this.plomSettings and the UI with the X message
 */
PlomIc.prototype.process_hat_and_update_UI = function(msg){

  var hat = [];
  for (var p=0; p< (this.N_PAR_SV*this.N_CAC); p++) {
    hat[p] = msg[2+p*3];
  }

  //get the population size at time t (pop_size_t)
  var p_t = this.plomSettings.data.par_fixed_values.p_t;

  if (p_t) {

    var pop_size_t = p_t[0];

  } else if (this.plomSettings.POP_SIZE_EQ_SUM_SV) {

    var pop_size_t = [];

    for(var cac=0; cac< this.N_CAC; cac++){
      var sum_sv = 0.0;
      for(var p=0; p< this.N_PAR_SV; p++){
        sum_sv += hat[p*this.N_CAC+cac];
      }
      pop_size_t.push(sum_sv);
    }

  } else {

    var pop_size_t = this.plomSettings.data.pop_size_t0;

  }

  var that = this;
  var offset = 0;
  var hat_cac = [];
  this.plomSettings.orders.par_sv.forEach(function(par) {
    var par_object = that.theta.value[par];

    //we create a map (here it will be an array) that goes from cac -> group_id
    var map_group = [];
    for(var cac=0; cac< this.N_CAC ; cac++) map_group.push(0.0);

    var group = that.theta.partition[par_object.partition_id]['group'];
    group.forEach(function(g){
      g.population_id.forEach(function(p){
        var cac = that.plomSettings.orders.cac_id.indexOf(p);
        map_group[cac] = g.id;
      });
    });

    //initialize guess to 0
    for(g in par_object.guess) {
      par_object.guess[g] = 0.0;
    }

    hat_cac = hat.slice(offset, offset+that.N_CAC);
    offset += that.N_CAC;

    for(var cac = 0; cac<that.N_CAC; cac++){
      par_object.guess[map_group[cac]] += hat_cac[cac] / pop_size_t[cac];
    }

    group.forEach(function(g){
      var x = par_object.guess[g.id] / g.population_id.length;
      par_object.guess[g.id] = x;

      $('input.parameters[name= "guess___'  + par + '___' + g.id +'"]').val(x.toPrecision(4));

      if(x < par_object.min[g.id]){
        par_object.min[g.id] = x;
        $('input.parameters[name= "min___'  + par+ '___' + g.id +'"]').val(x.toPrecision(4));
      }

      if(x > par_object.max[g.id]){
        par_object.max[g.id] = x;
        $('input.parameters[name= "max___'  + par+ '___' + g.id +'"]').val(x.toPrecision(4));
      }

    });

  });

};
