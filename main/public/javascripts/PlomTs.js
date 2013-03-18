/**
 * PlomTs
 *
 * options:
 * context (from context.json)
 * process (from process.json)
 * link (from link.json)
 * theta  (from theta.json)
 * graphTrajId, an id for the traj plot
 * graphDiffusionId, an id for the diffusion plot
 * graphLikeId, an id for the likelihood/ESS plot
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

  this.isDrift =  (('diffusion' in this.process) && this.process.diffusion.length);

  this.offsetX = 2+this.N_PAR_SV*this.N_CAC;
  this.offsetHat = 1+this.N_PAR_SV*this.N_CAC*3;
  this.offsetDrift = this.offsetX + this.N_TS;
  this.offsetDriftHat = this.offsetHat+ this.N_TS*3;

  this.set_data_ts();
  this.graph_ts = this.makeGraph();

  //only defined if the model contains drift
  if(this.isDrift){
    this.data_drift = this.set_data_drift();
    this.graph_drift = this.makeGraphDrift(divGraph_drift, vizSelector_drift);
  } else {
    this.data_drift = null;
    this.graph_drift = null;
  }

};


PlomTs.prototype.set_data_ts = function(){
  //get the time series data. Data are repeated 3 times to allow for custom error bars:
  //simulation (X) and (hat) will fill the null values

  this.data_ts = [];
  for(var i=0; i<this.data.length; i++){
    this.data_ts.push(new Array(1+this.N_TS*2));
    this.data_ts[i][0] = this.data[i][0];

    for(var ts=0; ts<(this.N_TS); ts++){
      this.data_ts[i][ts+1] = new Array(3);
      this.data_ts[i][this.N_TS + ts+1] = new Array(3);
      for(var j=0; j<3; j++){
        this.data_ts[i][ts+1][j] = this.data[i][ts+1];
        this.data_ts[i][this.N_TS+ts+1][j] = null;
      }
    }
  }

};


PlomTs.prototype.makeGraph = function(){

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
    showRoller: true,
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

  var g = new Dygraph($('#' +this.graphTrajId)[0], this.data_ts, options);

  //repeat colors so that data and simul have the same colors
  var cols = d3.range(this.N_TS).map(d3.scale.category10());
  g.updateOptions({'colors': cols.concat(cols)});

  return g;
};




//PlomTs.prototype.processMsg = function(msg, appendLog){
//
//  switch(msg.flag){
//
//  case 'log':
//    appendLog(msg.msg, false);
//    break;
//
//  case 'err':
//    appendLog(msg.msg, true);
//    break;
//
//  case 'X':
//    this.process_X(msg.msg);
//    break;
//
//  case 'hat':
//    this.process_hat(msg.msg);
//    break;
//  }
//};
//
//
//PlomTs.prototype.makeGraphDrift = function(divGraph, vizSelector){
//
//  var viz = [];
//  $(vizSelector).each(function(){
//    viz.push( ($(this).attr('checked')) );
//  });
//
//
//  var options={
//    //	stepPlot: true,
//    labels: ["time"].concat(this.allDrift),
//    yLabelWidth: 50,
//    customBars:true,
//    axisLabelFontSize:8,
//    visibility: viz,
//    digitsAfterDecimal:6,
//    animatedZooms: true,
//    labelsDivStyles:{'fontSize':'8pt', 'backgroundColor': 'transparent'},
//    labelsSeparateLines: true,
//    highlightCircleSize: 3,
//    highlightSeriesOpts: {
//      strokeWidth: 3,
//      strokeBorderWidth: 1,
//      highlightCircleSize: 5,
//    }
//  };
//
//  var g = myDygraph(divGraph, this.data_drift, options);
//
//  var cols = d3.range(this.allDrift.length).map(d3.scale.category10());
//  g.updateOptions({'colors': cols});
//
//  return g;
//};
//
//
//PlomTs.prototype.set_data_drift = function(){
//  //get the time series data. Data are repeated 3 times to allow for custom error bars:
//  //simulation (X) and (hat) will fill the null values
//
//  var data = [];
//
//  for(var i=0; i<this.data.length; i++){
//    data.push(new Array(1+(this.allDrift.length)));
//    data[i][0] = this.dates[i];
//    for(var j=0; j<((this.allDrift.length)); j++){
//      data[i][1+j] = new Array(3);
//    };
//  }
//
//  return data;
//};
//
//
//
//PlomTs.prototype.process_hat = function(msg){
//  //process an hat message and load this.states
//
//    var lp =this.N_PAR_SV*this.N_CAC;
//    this.states = [];
//
//    for(var t=0, l=msg.length; t<l; t++){
//
//      //ts
//      for(var ts=0; ts<this.N_TS; ts++){
//        for(var j=0; j<3; j++){
//          this.data_ts[t][this.N_TS+1+ts][j] = msg[t][this.offsetHat+ts*3+j];
//        }
//      }
//      //drift (if it exists)
//      for(var i=0; i<this.allDrift.length; i++){
//        for(var j=0; j<3; j++){
//          this.data_drift[t][1+i][j] = msg[t][this.offsetDriftHat+i*3+j];
//        }
//      }
//
//      this.states.push(new Array(lp));
//      for(var p=0; p<lp; p++){
//        this.states[t][p] = msg[t][2+p*3];
//      }
//    }
//
//
//};
//
//PlomTs.prototype.process_X = function(msg){
//  //take an X msg and fill a hat data
//
//  var n = msg[0][1];
//
//  //ts
//  for(var ts=0; ts<this.N_TS; ts++){
//    for(var j=0; j<3; j++){
//      this.data_ts[n-1][this.N_TS+ts+1][j] = msg[0][this.offsetX+ts];
//    }
//  }
//  //drift (if it exists)
//  for(var i=0; i<this.allDrift.length; i++){
//    for(var j=0; j<3; j++){
//      this.data_drift[n-1][1+i][j] = msg[0][this.offsetDrift+i];
//    }
//  }
//
//};
//
//PlomTs.prototype.run(socket){
//
//  plomGlobal.consoleCounter = 0;
//  $('div#logs').html('<p></p>');
//
//  plomTs.data_ts = plomTs.set_data_ts();
//
//  if(plomTs.graph_drift){
//    plomTs.data_drift = plomTs.set_data_drift();
//  }
//
//  if(socket){
//    var method = $('input[name=filter]:checked').val();
//    var integration = $('input[name=sto]').is(':checked') ? 'sto': 'deter';
//    var J = parseInt($('input#n_realisations').val(), 10);
//
//    var exec = {traj:   {exec:'smc',    opt: [integration, '--traj', '-J ' +J, '-t', '-b', '-P 1']},
//                smc:    {exec:'smc',    opt: [integration, '--traj', '-J ' +J, '-b', '-P 1']},
//                kalman: {exec:'kalman', opt: [integration, '--traj']}};
//
//    socket.emit('start', {'exec':exec[method], 'plomModelId':plomGlobal.modelId, 'theta':plomTs.theta});
//
//    plomGlobal.intervalId.push(setInterval(function(){
//      plomTs.graph_ts.updateOptions( { 'file': plomTs.data_ts } );
//      if(plomTs.graph_drift){
//        plomTs.graph_drift.updateOptions( { 'file': plomTs.data_drift } );
//      }
//    }, 100));
//
//  } else{
//    alert("Can't connect to the websocket server");
//  }
//};

