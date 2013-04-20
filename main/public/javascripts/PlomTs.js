/**
 * PlomTs
 *
 * options:
 * context (from context.json)
 * process (from process.json)
 * link (from link.json)
 * theta  (from theta.json)
 * X (from diagnostic)
 * graphTrajId, an id for the traj plot
 * graphStateId, an id for the state variable plots
 * graphPredResId, an id for the residuals plot
 * graphEssId, an id for the ESS plot
 */

function PlomTs(options) {

  for(var o in options){
    this[o] = options[o];
  }

  this.N_TS = this.context.time_series.length;
  this.N_CAC = this.theta.partition['variable_population']['group'].length;

  this.N_PAR_SV = this.process.state.length;

  this.data = this.context.data.filter(function(x){return x.id === 'data'})[0].source.slice(1);

  //fix dates
  for(var i=0; i<this.data.length; i++){
    this.data[i][0] = new Date(this.data[i][0]);
  }

  var stateName = [];
  this.process.state.forEach(function(s){
    options.context.population.forEach(function(g){
      stateName.push(s.id + ':' + g.id);
    });
  });
  this.stateName = stateName;

  this.tsName = this.context.time_series.map(function(x){return x.id;});  

  this.isDrift =  (('diffusion' in this.process) && this.process.diffusion.length);
  this.setDriftName();

  this.offsetHat = 1+this.N_PAR_SV*this.N_CAC*3;
  this.offsetDriftHat = this.offsetHat+ this.N_TS*3;

  this.setDataTraj();
  this.graphTraj = this.makeGraphTraj();

  this.setDataState();
  this.graphState = this.makeGraphState();


  if(this.graphPredResId){
    this.setDataPredRes();
    this.graphPredRes = this.makeGraphPredRes();
  }

  if(this.graphEssId){
    this.setDataEss();
    this.graphEss = this.makeGraphEss();
  }

};


PlomTs.prototype.setDriftName = function(){

  var driftName = [];
  if(this.isDrift){
    this.process.diffusion.forEach(function(d){
      var p = options.theta.value[d.parameter].partition_id;
      options.theta.partition[p].group.forEach(function(g){
        driftName.push('drift:' + d.parameter + ':' + g.id);
      });
    });
  }
  this.driftName = driftName;
}

PlomTs.prototype.getStateNames = function(){
  return this.stateName.concat(this.driftName);
};

PlomTs.prototype.getTrajNames = function(){
  return this.context.time_series.map(function(x){return x.id});
};


PlomTs.prototype.updateTheta = function(theta, X){
  this.theta = theta;
  this.X = X;

  this.setDriftName();

  this.setDataTraj();
  this.updateGraphTraj();

  this.setDataState();
  this.graphState = this.makeGraphState();


  if(this.graphPredResId){
    this.setDataPredRes();
    this.updateGraphPredRes();
  }

  if(this.graphEssId){
    this.setDataEss();
    this.updateGraphEss();
  }
};


PlomTs.prototype.setDataTraj = function(){
  //get the time series data. Data are repeated 3 times to allow for custom error bars:
  //simulation (X) and (hat) will fill the null values

  var that = this;

  that.dataTraj = [];
  for(var i=0; i<that.data.length; i++){
    that.dataTraj.push(new Array(1+that.N_TS*2));
    that.dataTraj[i][0] = that.data[i][0];

    that.tsName.forEach(function(name, ts){

      that.dataTraj[i][ts+1] = new Array(3);
      that.dataTraj[i][that.N_TS + ts+1] = new Array(3);

      //data
      for(var j=0; j<3; j++){
        that.dataTraj[i][ts+1][j] = that.data[i][ts+1];
      }

      //model prediction
      if(that.X){
        that.dataTraj[i][that.N_TS+ts+1][0] = that.X.q5['obs_mean:' + name][i];
        that.dataTraj[i][that.N_TS+ts+1][1] = that.X.mean['obs_mean:' + name][i];
        that.dataTraj[i][that.N_TS+ts+1][2] = that.X.q95['obs_mean:' + name][i];
      }

    });

  }
};


PlomTs.prototype.setDataState = function(){

  var names = this.stateName.concat(this.driftName);
  var that = this;

  that.dataState = [];
  for(var i=0; i<that.data.length; i++){
    that.dataState.push(new Array(1+names.length));
    that.dataState[i][0] = that.data[i][0];

    names.forEach(function(name, s){
      that.dataState[i][s+1] = new Array(3);

      if(that.X){
        that.dataState[i][s+1][0] = that.X.q5[name][i];
        that.dataState[i][s+1][1] = that.X.mean[name][i];
        that.dataState[i][s+1][2] = that.X.q95[name][i];
      }
    });

  }
};



PlomTs.prototype.setDataPredRes = function(){
  this.dataPredRes = [];
  for(var i=0; i<this.data.length; i++){
    this.dataPredRes.push(new Array(1+this.N_TS));
    this.dataPredRes[i][0] = this.data[i][0];
    for(var ts=0; ts<(this.N_TS); ts++){
      this.dataPredRes[i][ts+1] = null;
    }
  }
};


PlomTs.prototype.setDataEss = function(){
  this.dataEss = [];
  for(var i=0; i<this.data.length; i++){
    this.dataEss.push([this.data[i][0], null]);
  }
};



PlomTs.prototype.makeGraphTraj = function(){

  var fullLabels = ["time"].concat(this.context.time_series.map(function(x){return 'data ' + x.id.split('__').join(' ')}),
                                   this.context.time_series.map(function(x){return 'fit ' + x.id.split('__').join(' ')}));

  var options={
    rollPeriod: 1,
    //	stepPlot: true,
    labels: fullLabels,
    yLabelWidth: 50,
    customBars:true,
    axisLabelFontSize:8,
    digitsAfterDecimal:6,
    animatedZooms: true,
    //labelsDivStyles:{'fontSize':'8pt', 'backgroundColor': 'transparent'},
    showLabelsOnHighlight:false,
    labelsSeparateLines: true,
    showRoller: false,
    highlightCircleSize: 2,
    highlightSeriesOpts: {
      strokeWidth: 2,
      strokeBorderWidth: 1,
      highlightCircleSize: 3,
    }
  };

  for(var i=0; i<this.N_TS; i++){
    options[fullLabels[i+1]] = {strokePattern: Dygraph.DOT_DASH_LINE};
  }

  var g = new Dygraph($('#' +this.graphTrajId)[0], this.dataTraj, options);
  //repeat colors so that data and simul have the same colors
  var cols = d3.range(this.N_TS).map(d3.scale.category10());
  g.updateOptions({'colors': cols.concat(cols)});

  return g;
};


PlomTs.prototype.makeGraphState = function(){

  var fullLabels = ["time"].concat(this.stateName, this.driftName);

  var options={
    rollPeriod: 1,
    //	stepPlot: true,
    labels: fullLabels,
    yLabelWidth: 50,
    customBars:true,
    axisLabelFontSize:8,
    digitsAfterDecimal:6,
    animatedZooms: true,
    //labelsDivStyles:{'fontSize':'8pt', 'backgroundColor': 'transparent'},
    showLabelsOnHighlight:false,
    labelsSeparateLines: true,
    showRoller: false,
    highlightCircleSize: 2,
    highlightSeriesOpts: {
      strokeWidth: 2,
      strokeBorderWidth: 1,
      highlightCircleSize: 3,
    }
  };

  var g = new Dygraph($('#' +this.graphStateId)[0], this.dataState, options);
  var cols = d3.range(fullLabels.length-1).map(d3.scale.category10());
  g.updateOptions({'colors': cols});

  return g;
};


PlomTs.prototype.makeGraphPredRes = function(){

  var options={
    rollPeriod: 1,
    labels: ["time"].concat(this.context.time_series.map(function(x){return 'data ' + x.id.split('__').join(' ')})),
    yLabelWidth: 50,
    axisLabelFontSize:8,
    digitsAfterDecimal:6,
    animatedZooms: true,
    //labelsDivStyles:{'fontSize':'8pt', 'backgroundColor': 'transparent'},
    showLabelsOnHighlight:false,
    labelsSeparateLines: true,
    showRoller: false,
    drawAxesAtZero: true,
    includeZero: true,
    drawPoints: true,
    pointSize: 2,
    strokeWidth: 0.0,
    highlightCircleSize: 2,
    highlightSeriesOpts: {
      highlightCircleSize: 3,
    }
  };

  var g = new Dygraph($('#' +this.graphPredResId)[0], this.dataPredRes, options);
  var cols = d3.range(this.N_TS).map(d3.scale.category10());
  g.updateOptions({'colors': cols});

  return g;
};


PlomTs.prototype.makeGraphEss = function(){

  var fullLabels = ["time", "ESS"];

  var options={
    stepPlot: true,
    labels: fullLabels,
    yLabelWidth: 50,
    axisLabelFontSize:8,
    animatedZooms: true,
    showLabelsOnHighlight:false,
    labelsSeparateLines: true,
    showRoller: false,
    highlightCircleSize: 2,
    highlightSeriesOpts: {
      strokeWidth: 2,
      strokeBorderWidth: 1,
      highlightCircleSize: 3,
    }
  };

  return new Dygraph($('#' +this.graphEssId)[0], this.dataEss, options);

};




PlomTs.prototype.updateGraphState = function(){
  this.graphState.updateOptions( { 'file': this.dataState } );
};

PlomTs.prototype.updateGraphTraj = function(){
  this.graphTraj.updateOptions( { 'file': this.dataTraj } );
};

PlomTs.prototype.updateGraphPredRes = function(){
  this.graphPredRes.updateOptions( { 'file': this.dataPredRes } );
};

PlomTs.prototype.updateGraphEss = function(){
  this.graphEss.updateOptions( { 'file': this.dataEss } );
};

PlomTs.prototype.updateGraphs = function(){
  this.updateGraphState();
  this.updateGraphTraj();
  this.updateGraphPredRes();
  this.updateGraphEss();
};



/**
 * options: {method, implementation, J, DT}
 **/

PlomTs.prototype.run = function(socket, options){

  var that = this;

  this.setDataTraj();
  this.setDataState();
  this.setDataPredRes();
  this.setDataEss();

  if(socket){
    var exec = {
      simul:  {exec: 'smc',    opt: [options.impl, '-J ' + options.J, '-t', '-b', '-P 1']},
      smc:    {exec: 'smc',    opt: [options.impl, '-J ' + options.J, '-b', '-P 1']},
      kalman: {exec: 'kalman', opt: [options.impl, '-b']}
    };
    
    socket.emit('start', {'exec': exec[options.algo], 'plomModelId': this.link._id, 'theta': {partition: this.theta.partition, parameter: this.theta.parameter}});

    plomGlobal.intervalId.push(setInterval(function(){
      that.updateGraphs();
    }, 100));

  } else{
    alert("Can't connect to the websocket server");
  }

};


PlomTs.prototype.processMsg = function(msg, appendLog){

  switch(msg.flag){

  case 'log':
    console.log(msg.msg);
    break;

  case 'err':
    console.error(msg.msg);
    break;

  case 'hat':
    this.processHat(msg.msg);
    break;

  case 'pred_res':
    this.processPredRes(msg.msg);
    break;
  }

};


/**
 *process an hat message
 */
PlomTs.prototype.processHat = function(msg){

  var n = msg[0];

  for(var j=0; j<3; j++){
    //states
    for(var s=0; s< this.stateName.length; s++){
      this.dataState[n-1][1+s][j] = msg[1+s*3+j];
    }

    //drift (if it exists)
    for(var i=0; i<this.driftName.length; i++){
      this.dataState[n-1][1+this.stateName.length+i][j] = msg[this.offsetDriftHat+i*3+j];
    }

    //ts
    for(var ts=0; ts<this.N_TS; ts++){
      this.dataTraj[n-1][this.N_TS+1+ts][j] = msg[this.offsetHat+ts*3+j];
    }
  }

};

/**
 *process a pred_res message
 */
PlomTs.prototype.processPredRes = function(msg){
  var n = msg[0]-1;
  for(var ts=0; ts<this.N_TS; ts++){
    this.dataPredRes[n][1+ts] = msg[2+2*ts];
  }
  //ess (if exists)
  this.dataEss[n][1] = msg[1+2*this.N_TS];
};
