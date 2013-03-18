//////////////////////////////////////////////////////////////////////////////
//PlomMif
//////////////////////////////////////////////////////////////////////////////

//inherit from PlomBest
function PlomMif(plomSettings, theta, divGraph, vizSelector, updatePlomSettings, divGraph_mif_within) {

  PlomBest.call(this, plomSettings, theta, divGraph, vizSelector, updatePlomSettings);

  this.N_CAC = plomSettings.cst.N_C*plomSettings.cst.N_AC;
  this.N_DATA = plomSettings.cst.N_DATA;
  this.unit = this.plomSettings.cst.FREQUENCY;

  var allParName = [];
  var allParType = [];
  for(var i=0; i< plomSettings.orders['par_proc'].length; i++){
    allParName.push(plomSettings.orders['par_proc'][i]);
    allParType.push('par_proc');
  }
  for(var i=0; i< plomSettings.orders['par_obs'].length; i++){
    allParName.push(plomSettings.orders['par_obs'][i]);
    allParType.push('par_obs');
  }

  var theta= this.theta;
  var theta_mif = [];
  ['par_proc', 'par_obs'].forEach(function(el){
    plomSettings.orders[el].forEach(function(p){

      if(plomSettings.orders.drift_var.indexOf(['drift', 'par_proc', p].join('__')) === -1 ) { //if p is NOT a drift variable
        var id = theta.value[p]['partition_id'];
        theta.partition[id]['group'].forEach(function(group, i) {
          theta_mif.push(p + ' ' + group.id.split('__').slice(0,2).join(' '));
        });
      };
    });
  });
  this.theta_mif = theta_mif;

  this.N_THETA_MIF = this.theta_mif.length;

  this.dates = [];
  for(var i=0; i<plomSettings.data.dates.length; i++){
    this.dates[i] = new Date(plomSettings.data.dates[i]);
  }

  this.data_mif = this.set_data_mif();
  this.graph_mif = this.makeGraph_mif(divGraph_mif_within);
};


PlomMif.prototype = Object.create(PlomBest.prototype);
PlomMif.prototype.constructor = PlomMif;

PlomMif.prototype.makeGraph_mif = function(divGraph){

  //start with only ess visible
  var viz = [];
  for(var i=0; i<this.N_THETA_MIF; i++){
    viz.push( false );
  }
  viz.push(true);

  var options={
    rollPeriod: 1,
    //	stepPlot: true,
    yLabelWidth: 50,
    errorBars:true,
    axisLabelFontSize:8,
    visibility: viz,
    digitsAfterDecimal:6,
    labelsDivStyles:{'fontSize':'8pt', 'backgroundColor': 'transparent'},
    labelsSeparateLines: true,
    showRoller: true,
    highlightCircleSize: 3,
    highlightSeriesOpts: {
      strokeWidth: 3,
      strokeBorderWidth: 1,
      highlightCircleSize: 5,
    }
  };

  options.labels = ["iterations"].concat(this.theta_mif);
  options.labels.push('ESS');

  var g = myDygraph(divGraph, this.data_mif, options);
  var cols = d3.range(this.N_THETA_MIF+1).map(d3.scale.category10());
  g.updateOptions({'colors': cols});

  return g;
};

PlomMif.prototype.set_data_mif = function(){
  //get the MIF data. Data are repeated 2 times to allow for error bars:

  var data = [];
  for(var i=0; i<this.N_DATA; i++){
    data.push(new Array(2+this.N_THETA_MIF));
    data[i][0] = this.dates[i];
    for(var j=0; j<(this.N_THETA_MIF+1); j++){
      data[i][1+j] = new Array(2);
    };
  }

  return data;
};

PlomMif.prototype.process_mif = function(msg){
  //process a mif message

  var x = msg[1]-1;

  if(x === 0){ //reset graph every m iteration
    this.data_mif = this.set_data_mif()
  };

  for(var i=0; i<this.N_THETA_MIF; i++){
    this.data_mif[x][i+1][0] = msg[2+i*2];
    this.data_mif[x][i+1][1] = msg[3+i*2];
  }

  this.data_mif[x][1+this.N_THETA_MIF][0] = msg[2+this.N_THETA_MIF*2];
  this.data_mif[x][1+this.N_THETA_MIF][1] = 0.0;

  if(x === (this.N_DATA-1)){
    this.graph_mif.updateOptions( { 'file': this.data_mif } );
  };
};


PlomMif.prototype.processMsg = function(msg, appendLog){

  switch(msg.flag){

  case 'log':
    appendLog(msg.msg, false);
    break;

  case 'err':
    appendLog(msg.msg, true);
    break;

  case 'mif':
    this.process_mif(msg.msg);
    break;

  case 'best':
    this.process_best(msg.msg);
    break;
  }

};
