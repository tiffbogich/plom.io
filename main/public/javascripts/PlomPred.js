/**
 * PlomPred
 *
 * options:
 * context (from context.json)
 * process (from process.json)
 * link (from link.json)
 * theta  (from theta.json)
 * theta_id (from theta.json)
 * X (from diagnostic)
 * graphTrajId, an id for the traj plot
 * graphStateId, an id for the state variable plots
 */

function PlomPred(options) {

  for(var o in options){
    this[o] = options[o];
  }


  this.indexDataClicked = 0;


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


  this.setDriftName();

  this.allStateName = stateName.concat(this.driftName);

  this.tsName = this.context.time_series.map(function(x){return x.id;});  



  this.offsetHat = 1+this.N_PAR_SV*this.N_CAC*3;
  this.offsetDriftHat = this.offsetHat+ this.N_TS*3;

  this.setDataTraj(0);
  this.graphTraj = this.makeGraphTraj();

  this.setDataState();
  this.graphState = this.makeGraphState();

};


PlomPred.prototype.setDriftName = function(){

  var driftName = [];
  if((('diffusion' in this.process) && this.process.diffusion.length)){
    this.process.diffusion.forEach(function(d){
      var p = options.theta.value[d.parameter].partition_id;
      options.theta.partition[p].group.forEach(function(g){
        driftName.push('drift:' + d.parameter + ':' + g.id);
      });
    });
  }
  this.driftName = driftName;
}

PlomPred.prototype.getStateNames = function(){
  return this.stateName.concat(this.driftName);
};

PlomPred.prototype.getTrajNames = function(){
  return this.context.time_series.map(function(x){return x.id});
};


PlomPred.prototype.setDataTraj = function(extraLength){
  //copy data_ts, add future dates if needed and add null for the
  //future steps so that simul can write it's trajectory inside values
  //are repeated 3 times to allow for custom error bars:

  var increments = {'D': 60*60*24*1000}; //quantity to add to increment a day in millisecond
  increments['W'] = increments['D']*7;
  increments['M'] = increments['D']*30;
  increments['Y'] = increments['D']*365;

  var that = this;

  that.dataTraj = [];
  for(var i=0; i<that.data.length; i++){
    that.dataTraj.push(new Array(1+that.N_TS*3));
    that.dataTraj[i][0] = that.data[i][0];

    that.tsName.forEach(function(name, ts){

      that.dataTraj[i][ts+1] = new Array(3);
      that.dataTraj[i][that.N_TS + ts+1] = new Array(3);
      that.dataTraj[i][2*that.N_TS + ts+1] = new Array(3);

      //data
      for(var j=0; j<3; j++){
        that.dataTraj[i][ts+1][j] = that.data[i][ts+1];
      }

      //model prediction
      that.dataTraj[i][that.N_TS+ts+1][0] = that.X.lower['obs_mean:' + name][i];
      that.dataTraj[i][that.N_TS+ts+1][1] = that.X.mean['obs_mean:' + name][i];
      that.dataTraj[i][that.N_TS+ts+1][2] = that.X.upper['obs_mean:' + name][i];


    });

  }

  //extend array (data, simul, prediction each an array of 3 values for confidence envelopes);
  var lastDataTimeMs = that.data[that.data.length-1][0].getTime();
  var inc = increments[that.context.frequency];


  for (var i=0; i< extraLength; i++){
    that.dataTraj.push([new Date(lastDataTimeMs +(i+1)*inc)]);
    for(var j=0; j<(that.N_TS*3); j++){
      that.dataTraj[that.data.length+i].push([null, null, null]);
    };
  }

  that.tsName.forEach(function(name, ts){
    that.dataTraj[that.indexDataClicked][2*that.N_TS+ts+1][0] = that.X.lower['obs_mean:' + name][that.indexDataClicked];
    that.dataTraj[that.indexDataClicked][2*that.N_TS+ts+1][1] = that.X.mean['obs_mean:' + name][that.indexDataClicked];
    that.dataTraj[that.indexDataClicked][2*that.N_TS+ts+1][2] = that.X.upper['obs_mean:' + name][that.indexDataClicked];
  });

};


PlomPred.prototype.setDataState = function(){

  var that = this;

  that.dataState = [];
  for(var i=0; i<that.dataTraj.length; i++){
    that.dataState.push(new Array(1+2*that.allStateName.length));
    that.dataState[i][0] = that.dataTraj[i][0];

    that.allStateName.forEach(function(name, s){
      that.dataState[i][s+1] = new Array(3);
      that.dataState[i][that.allStateName.length + s + 1] = new Array(3);
      
      that.dataState[i][s+1][0] = that.X.lower[name][i];
      that.dataState[i][s+1][1] = that.X.mean[name][i];
      that.dataState[i][s+1][2] = that.X.upper[name][i];
    });
  }

  that.allStateName.forEach(function(name, s){    
    that.dataState[that.indexDataClicked][that.allStateName.length + s+1][0] = that.X.lower[name][that.indexDataClicked];
    that.dataState[that.indexDataClicked][that.allStateName.length + s+1][1] = that.X.mean[name][that.indexDataClicked];
    that.dataState[that.indexDataClicked][that.allStateName.length + s+1][2] = that.X.upper[name][that.indexDataClicked];
  });

};


PlomPred.prototype.makeGraphTraj = function(){

  var fullLabels = ["time"].concat(this.context.time_series.map(function(x){return 'data ' + x.id.split('__').join(' ')}),
                                   this.context.time_series.map(function(x){return 'fit ' + x.id.split('__').join(' ')}),
                                   this.context.time_series.map(function(x){return 'pred. ' + x.id.split('__').join(' ')}));

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
    options[fullLabels[2*this.N_TS+i+1]] = {strokeWidth: 4};
  }


  var that = this;
  options['clickCallback']= function(e, x, pts) {

    //if user select a date when no data are availabe (and hence no reconstructed IC), we reset his selection to the last possible value
    var lastPossibleDate = that.data[that.data.length-1][0].getTime();
    if(x > lastPossibleDate){
      x = lastPossibleDate;
    }
    //x is a time in ms, we want to convert x to index...
    that.indexDataClicked = 0;
    while((x !== that.data[that.indexDataClicked][0].getTime()) && (that.indexDataClicked < that.data.length)){
      that.indexDataClicked++
    };

    var updt = { 'underlayCallback': function(canvas, area, g) { //add a vertical line...
      var loc = g.toDomCoords(x, 0); //get the position in the canvas of the point (clicked, 0)
      // The drawing area doesn't start at (0, 0), it starts at (area.x, area.y).
      canvas.fillStyle = "rgba(220, 220, 220, 0.8)";//left
      canvas.fillRect(area.x, area.y, loc[0]-area.x, area.h);

      canvas.fillStyle = "rgba(238, 238, 238, 0.1)";//right
      canvas.fillRect(loc[0], area.y, area.w, area.h);
    }}

    that.graphTraj.updateOptions(updt);
    that.graphState.updateOptions(updt);

    $('#runPred').trigger('click');
  };


  var g = new Dygraph($('#' +this.graphTrajId)[0], this.dataTraj, options);
  //repeat colors so that data and simul have the same colors
  var cols = d3.range(this.N_TS).map(d3.scale.category10());
  g.updateOptions({'colors': cols.concat(cols, cols)});

  g.resize(900, 400);

  return g;
};


PlomPred.prototype.makeGraphState = function(){

  var fullLabels = ["time"].concat(this.allStateName, 
                                   this.allStateName.map(function(x){return 'pred. '+ x;})
                                  );

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

  for(var i=0; i<this.allStateName.length; i++){
    options[fullLabels[this.allStateName.length+i+1]] = {strokeWidth: 4};
  }


  var g = new Dygraph($('#' +this.graphStateId)[0], this.dataState, options);
  var cols = d3.range(this.allStateName.length).map(d3.scale.category10());
  g.updateOptions({'colors': cols.concat(cols)});

  g.resize(900, 400);

  return g;
};


PlomPred.prototype.updateGraphs = function(){
  this.graphState.updateOptions( { 'file': this.dataState } );
  this.graphTraj.updateOptions( { 'file': this.dataTraj } );
};

PlomPred.prototype.reset = function(){

  this.indexDataClicked = 0;
  this.setDataTraj(0);
  this.setDataState();

  this.updateGraphs();

  var updt = { 
    'underlayCallback': function(canvas, area, g) {
      canvas.fillStyle = "rgba(255, 255, 255, 1)";
      canvas.fillRect(area.x, area.y, area.w, area.h);
    }
  };

  this.graphTraj.updateOptions(updt);
  this.graphState.updateOptions(updt);

  this.graphTraj.resize();
  this.graphState.resize();
};



PlomPred.prototype.processMsg = function(msg){

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
PlomPred.prototype.processHat = function(msg){

  var n = msg[0];

  for(var j=0; j<3; j++){
    //states
    for(var s=0; s< this.stateName.length; s++){
      this.dataState[n][1+ this.allStateName.length + s][j] = msg[1+s*3+j];
    }

    //drift (if it exists)
    for(var i=0; i<this.driftName.length; i++){
      this.dataState[n][1+ this.allStateName.length + this.stateName.length+i][j] = msg[this.offsetDriftHat+i*3+j];
    }

    //ts
    for(var ts=0; ts<this.N_TS; ts++){
      this.dataTraj[n][2*this.N_TS+1+ts][j] = msg[this.offsetHat+ts*3+j];
    }
  }

};



/**
 * options: {impl, DT}
 **/

PlomPred.prototype.run = function(socket, options){

  var that = this;

  if(socket){

    that.indexDataClicked = that.indexDataClicked || 0;

    var extraYears = parseInt($('#nExtra').val(), 10) || 0;
    //convert extraYears in timesteps
    var multiplier = {'D': 365, 'W': 365/7, 'M': 12, 'Y':1};
    var nExtra = Math.round(extraYears * multiplier[that.context.frequency]);

    this.setDataTraj(nExtra);
    this.setDataState();

    var t0 = that.indexDataClicked;
    var tend = that.dataTraj.length-1;

    var msg = {
      exec: {
        exec: 'simul',
        opt: [options.impl, '-D '+ tend, '-o '+ t0, '--predict', '--traj', '-P 1']
      }, 
      n: t0,
      plomModelId: this.link._id,
      plomThetaId: this.theta_id,
      plomTraceId: this.trace_id
    };

    socket.emit('start', msg);

    plomGlobal.intervalId.push(setInterval(function(){
      that.updateGraphs();
    }, 100));

  } else{
    alert("Can't connect to the websocket server");
  }

};
