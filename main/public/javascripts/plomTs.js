//////////////////////////////////////////////////////////////////////////////
//PlomTs
//////////////////////////////////////////////////////////////////////////////
function PlomTs(plomSettings, theta, divGraph_ts, divGraph_drift, divGraph_pred, vizSelector_ts, vizSelector_drift, vizSelector_pred) {

  this.plomSettings = plomSettings; //just a ref
  this.theta = theta;
  this.itheta = null; //intervention model settings

  this.FREQUENCY = plomSettings.cst.FREQUENCY;
  this.N_TS = plomSettings.cst.N_TS;
  this.N_CAC = plomSettings.cst.N_C*plomSettings.cst.N_AC;
  this.N_PAR_SV = plomSettings.cst.N_PAR_SV;
  this.N_DATA = plomSettings.cst.N_DATA;
  this.unit = this.plomSettings.cst.FREQUENCY;
  this.ts_id = plomSettings.orders.ts_id;

  var allDrift = [];
  plomSettings.orders.drift_var.forEach(function(el){
    var par = el.split('__')[2]; //e.g drift__par_proc__r0
    var id = theta.value[par]['partition_id'];
    theta.partition[id]['group'].forEach(function(group, i){ //iterate on every group
      allDrift.push([par, group.id].join(' '));
    });
  });
  this.allDrift = allDrift;

  this.dates = [];
  for(var i=0; i<plomSettings.data.dates.length; i++){
    this.dates[i] = new Date(plomSettings.data.dates[i]);
  }



  this.data = plomSettings.data.data; //just a reference

  this.offsetX = 2+plomSettings.cst.N_PAR_SV*plomSettings.cst.N_C*plomSettings.cst.N_AC;
  this.offsetHat = 1+plomSettings.cst.N_PAR_SV*plomSettings.cst.N_C*plomSettings.cst.N_AC*3;
  this.offsetDrift = this.offsetX + this.N_TS;
  this.offsetDriftHat = this.offsetHat+ this.N_TS*3;

  //used to swap ts and pred
  this.states = []; //loaded by process_hat()

  this.data_ts = this.set_data_ts();
  this.graph_ts = this.makeGraph(divGraph_ts, vizSelector_ts);

  //only defined if the model contains drift
  if(this.plomSettings.orders.drift_var.length){
    this.data_drift = this.set_data_drift();
    this.graph_drift = this.makeGraphDrift(divGraph_drift, vizSelector_drift);
  } else {
    this.data_drift = null;
    this.graph_drift = null;
  }


  this.indexDataClicked = 1;
  this.is_pred = false;
  this.data_pred = this.set_data_pred(0);
  this.graph_pred = this.makeGraphPred(divGraph_pred, vizSelector_pred);

};


PlomTs.prototype.processMsg = function(msg, appendLog){

  switch(msg.flag){

  case 'log':
    appendLog(msg.msg, false);
    break;

  case 'err':
    appendLog(msg.msg, true);
    break;

  case 'X':
    this.process_X(msg.msg);
    break;

  case 'hat':
    this.process_hat(msg.msg);
    break;
  }
};


PlomTs.prototype.makeGraph = function(divGraph, vizSelector){
  //vizSelector should be 'input.plottedTs'

  var viz = [];
  $(vizSelector).each(function(){
    viz.push( ($(this).attr('checked')) );
  });

  for(var i=0; i<this.N_TS; i++){
    viz.push(viz[i]);
  }

  var fullLabels = ["time"].concat(this.ts_id.map(function(x){return 'data ' + x.split('__').slice(0,2).join(' ')}),
                                   this.ts_id.map(function(x){return 'fit ' + x.split('__').slice(0,2).join(' ')}));

  var options={
    rollPeriod: 1,
    //	stepPlot: true,
    labels: fullLabels,
    yLabelWidth: 50,
    customBars:true,
    axisLabelFontSize:8,
    visibility: viz,
    digitsAfterDecimal:6,
    animatedZooms: true,
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

  for(var i=0; i<this.N_TS; i++){
    options[fullLabels[i+1]] = {strokePattern: Dygraph.DOT_DASH_LINE};
  }

  var g = myDygraph(divGraph, this.data_ts, options);
  //repeat colors so that data and simul have the same colors

  var cols = d3.range(this.N_TS).map(d3.scale.category10());
  g.updateOptions({'colors': cols.concat(cols)});

  return g;
};


PlomTs.prototype.makeGraphPred = function(divGraph, vizSelector){

  var viz = [];
  $(vizSelector).each(function(){
    viz.push( ($(this).attr('checked')) );
  });
  viz = viz.concat(viz, viz);

  var fullLabels = ["time"].concat(this.ts_id.map(function(x){return 'data ' + x}),
                                   this.ts_id.map(function(x){return 'fit ' + x}),
                                   this.ts_id.map(function(x){return 'prediction ' + x}));



  var options={
    //	stepPlot: true,
    yLabelWidth: 50,
    labels: fullLabels,
    labelsDivStyles:{'fontSize':'8pt', 'backgroundColor': 'transparent'},
    labelsSeparateLines: true,
    customBars:true,
    axisLabelFontSize:8,
    visibility: viz,
    digitsAfterDecimal:6,
    animatedZooms: true,
    highlightCircleSize: 3,
    highlightSeriesOpts: {
      strokeWidth: 2,
      strokeBorderWidth: 1,
      highlightCircleSize: 5,
    }
  };

  for(var i=0; i<this.N_TS; i++){
    options[fullLabels[i+1]] = {strokePattern: Dygraph.DOT_DASH_LINE}; //MAKES DYGRAPH ON SAFARI SUPER SLOW...
    options[fullLabels[2*this.N_TS+i+1]] = {strokeWidth: 4};
  }

  var that = this;
  options['clickCallback']= function(e, x, pts) {

    //if user select a date when no data are availabe (and hence no reconstructed IC), we reset his selection to the last possible value
    var lastPossibleDate = that.dates[that.dates.length-1].getTime();
    if(x > lastPossibleDate){
      x = lastPossibleDate;
    }
    //x is a time in ms, we want to convert x to index...
    that.indexDataClicked = 0;
    while((x !== that.dates[that.indexDataClicked].getTime()) && (that.indexDataClicked < that.N_DATA)){
      that.indexDataClicked++
    };
    that.indexDataClicked++;

    that.graph_pred.updateOptions( { 'underlayCallback': function(canvas, area, g) { //add a vertical line...
      var loc = g.toDomCoords(x, 0); //get the position in the canvas of the point (clicked, 0)
      // The drawing area doesn't start at (0, 0), it starts at (area.x, area.y).
      canvas.fillStyle = "rgba(220, 220, 220, 0.8)";//left
      canvas.fillRect(area.x, area.y, loc[0]-area.x, area.h);

      canvas.fillStyle = "rgba(238, 238, 238, 0.1)";//right
      canvas.fillRect(loc[0], area.y, area.w, area.h);
    }});

    $('#runPred').trigger('click');
  };


  var g = myDygraph(divGraph, this.data_pred, options);
  //repeat colors so that data and simul have the same colors

  var cols = d3.range(this.N_TS).map(d3.scale.category10());
  g.updateOptions({'colors': cols.concat(cols, cols)});

  return g;
};



PlomTs.prototype.makeGraphDrift = function(divGraph, vizSelector){

  var viz = [];
  $(vizSelector).each(function(){
    viz.push( ($(this).attr('checked')) );
  });


  var options={
    //	stepPlot: true,
    labels: ["time"].concat(this.allDrift),
    yLabelWidth: 50,
    customBars:true,
    axisLabelFontSize:8,
    visibility: viz,
    digitsAfterDecimal:6,
    animatedZooms: true,
    labelsDivStyles:{'fontSize':'8pt', 'backgroundColor': 'transparent'},
    labelsSeparateLines: true,
    highlightCircleSize: 3,
    highlightSeriesOpts: {
      strokeWidth: 3,
      strokeBorderWidth: 1,
      highlightCircleSize: 5,
    }
  };

  var g = myDygraph(divGraph, this.data_drift, options);

  var cols = d3.range(this.allDrift.length).map(d3.scale.category10());
  g.updateOptions({'colors': cols});

  return g;
};




PlomTs.prototype.set_data_ts = function(){
  //get the time series data. Data are repeated 3 times to allow for custom error bars:
  //simulation (X) and (hat) will fill the null values

  var data = [];
  for(var i=0; i<this.N_DATA; i++){
    data.push(new Array(1+this.N_TS*2));
    for(var ts=0; ts<(this.N_TS*2); ts++){
      data[i][ts+1] = new Array(3);
    };
  }


  for(var i=0; i<this.N_DATA; i++){
    data[i][0] = this.dates[i];
    for(var ts=0; ts<this.N_TS; ts++){
      for(var j=0; j<3; j++){
        data[i][ts+1][j] = this.data[i][ts];
        data[i][this.N_TS+ts+1][j] = null;
      }
    }
  }

  return data;
};


PlomTs.prototype.set_data_drift = function(){
  //get the time series data. Data are repeated 3 times to allow for custom error bars:
  //simulation (X) and (hat) will fill the null values

  var data = [];

  for(var i=0; i<this.N_DATA; i++){
    data.push(new Array(1+(this.allDrift.length)));
    data[i][0] = this.dates[i];
    for(var j=0; j<((this.allDrift.length)); j++){
      data[i][1+j] = new Array(3);
    };
  }

  return data;
};


PlomTs.prototype.process_hat = function(msg){
  //process an hat message and load this.states

  if(! this.is_pred){
    var lp =this.N_PAR_SV*this.N_CAC;
    this.states = [];

    for(var t=0, l=msg.length; t<l; t++){

      //ts
      for(var ts=0; ts<this.N_TS; ts++){
        for(var j=0; j<3; j++){
          this.data_ts[t][this.N_TS+1+ts][j] = msg[t][this.offsetHat+ts*3+j];
        }
      }
      //drift (if it exists)
      for(var i=0; i<this.allDrift.length; i++){
        for(var j=0; j<3; j++){
          this.data_drift[t][1+i][j] = msg[t][this.offsetDriftHat+i*3+j];
        }
      }

      this.states.push(new Array(lp));
      for(var p=0; p<lp; p++){
        this.states[t][p] = msg[t][2+p*3];
      }
    }
  } else { //hat is generated by simul for every time step!

    var n = msg[0];
    for(var ts=0; ts<this.N_TS; ts++) {
      for(var j=0; j<3; j++){
        this.data_pred[n-1][2*this.N_TS+ts+1][j] = msg[this.offsetHat+ts*3+j];
      }
    }

    if(n === this.data_pred.length -1){
      this.graph_pred.updateOptions( { 'file': this.data_pred } );
    }

  };


};

PlomTs.prototype.process_X = function(msg){
  //take an X msg and fill a hat data

  var n = msg[0][1];

  //ts
  for(var ts=0; ts<this.N_TS; ts++){
    for(var j=0; j<3; j++){
      this.data_ts[n-1][this.N_TS+ts+1][j] = msg[0][this.offsetX+ts];
    }
  }
  //drift (if it exists)
  for(var i=0; i<this.allDrift.length; i++){
    for(var j=0; j<3; j++){
      this.data_drift[n-1][1+i][j] = msg[0][this.offsetDrift+i];
    }
  }

};


PlomTs.prototype.updateitheta = function(){
  return PlomSimul.prototype.updateitheta.call(this);
}

PlomTs.prototype.resetForecast = function(){
  PlomSimul.prototype.resetForecast.call(this);
}


PlomTs.prototype.set_data_pred = function(extraLength){
  //copy data_ts, add future dates if needed and add null for the future steps so that simul can write it's trajectory inside
  //values are repeated 3 times to allow for custom error bars:

  var increments = {'D': 60*60*24*1000}; //quantity to add to increment a day in millisecond
  increments['W'] = increments['D']*7;
  increments['M'] = increments['D']*30;
  increments['Y'] = increments['D']*365;

  var data = $.extend(true, [], this.data_ts); //deepcopy

  //add cells to receive simulation
  for (var n=0; n< data.length; n++){
    for(var ts=0; ts<this.N_TS; ts++){
      data[n].push([null, null, null]);
    }
  }

  //extend array (data, simul, prediction each an array of 3 values for confidence envelopes);
  var lastDataTimeMs = data[data.length-1][0].getTime();
  var inc = increments[this.unit];

  for (var i=0; i< extraLength; i++){
    data.push([new Date(lastDataTimeMs +(i+1)*inc)]);
    for(var j=0; j<(this.N_TS*3); j++){
      data[this.N_DATA+i].push([null, null, null]);
    };
  }

  for(var ts = 0; ts< this.N_TS; ts++){
    for(var k=0; k< 3; k++) {
      data[this.indexDataClicked-1][1+this.N_TS*2+ts][k] = this.data_ts[this.indexDataClicked-1][this.N_TS+ts+1][k];
    }
  }

  return data;
};
