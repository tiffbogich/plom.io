//////////////////////////////////////////////////////////////////////////////
//SfrSimul
//////////////////////////////////////////////////////////////////////////////
function SfrSimul(sfrSettings, divGraph_ts, divGraph_pred, vizSelector_ts, vizSelector_pred) {

  this.sfrSettings = sfrSettings; //just a ref
  this.iSettings = null; //intervention model settings
  this.par_int = []; //intervention parameters

  this.N_TS = sfrSettings.cst.N_TS;
  this.N_CAC = sfrSettings.cst.N_C* sfrSettings.cst.N_AC;
  this.N_PAR_SV = sfrSettings.cst.N_PAR_SV;
  this.ts_id = sfrSettings.orders.ts_id;

  this.offsetHat = 1+sfrSettings.cst.N_PAR_SV*sfrSettings.cst.N_C*sfrSettings.cst.N_AC*3;


  this.N_SIMUL = 0;

  this.unit = {D:'days', W:'weeks', M:'months', 'Y':'years'}[sfrSettings.cst.FREQUENCY];

  this.data_ts = this.set_data(this.N_TS);
  this.graph_ts = this.makeGraph(divGraph_ts, vizSelector_ts, this.ts_id, this.data_ts);

  this.saved_cases = []; for(var i = this.N_TS; i--;) this.saved_cases.push(0);
  this.total_cases_no_intervention = []; for(var i = this.N_TS; i--;) this.total_cases_no_intervention.push(0);

  this.saved_graph_updater = graphD32(this.saved_cases);

  this.states = [];
  this.indexDataClicked = 0;

  this.is_pred = false;
  this.data_pred = this.set_data_pred();
  this.graph_pred = this.makeGraphPred(divGraph_pred, vizSelector_pred);

}

SfrSimul.prototype.set_data = function(N){
  //reset states
  this.states = [];

  var data = [];
  data.push([0]);
  for(var i=1; i<= N; i++) {
    data[0][i] = [null, null, null];
  }

  return data;
};


SfrSimul.prototype.set_data_pred = function(){

  var data = [];
  for(var i=0; i<= this.data_ts.length; i++) {
    data.push([i]);
    for(var j = 0; j< this.N_TS; j++) {
      data[i][1+j] = [];
      data[i][1+this.N_TS+j] = [];
      for(var k=0; k< 3; k++) {
        data[i][1+j][k] = (i< this.data_ts.length)? this.data_ts[i][1+j][k]: null;
        data[i][1+this.N_TS+j][k] = null; //future prediction
      }
    }
  }

  for(var ts = 0; ts< this.N_TS; ts++){
    for(var k=0; k< 3; k++) {
      data[this.indexDataClicked][1+this.N_TS+ts][k] = this.data_ts[this.indexDataClicked][ts+1][k];
    }
    this.saved_cases[ts] = 0;
    this.total_cases_no_intervention[ts] = 0;
  }

  return data;
};


SfrSimul.prototype.processMsg = function(msg, appendLog){

  switch(msg.flag){

  case 'log':
    appendLog(msg.msg, false);
    break;

  case 'err':
    appendLog(msg.msg, true);
    break;

  case 'hat':
    this.process_hat(msg.msg);
    break;
  }
};

SfrSimul.prototype.process_hat = function(msg){

  var n = msg[0];

  if(this.is_pred) {

    for(var ts=0; ts<this.N_TS; ts++) {
      for(var j=0; j<3; j++) {
        this.data_pred[n][1+this.N_TS+ts][j] = msg[this.offsetHat+ts*3+j];
      }

      this.saved_cases[ts] += (this.data_pred[n][1+ts][1] - this.data_pred[n][1+this.N_TS+ts][1]);
      this.total_cases_no_intervention[ts] += this.data_pred[n][1+ts][1];
    }

  } else {
    //ts
    this.data_ts.push([n]);
    for(var ts=0; ts<this.N_TS; ts++) {
      this.data_ts[n][ts+1] = [];
      for(var j=0; j<3; j++){
        this.data_ts[n][ts+1][j] = msg[this.offsetHat+ts*3+j];
      }
    }


    //save states for forecasting
    var lp =this.N_PAR_SV*this.N_CAC;
    this.states.push([]);
    for(var p=0; p<lp; p++){
      this.states[n-1][p] = msg[2+p*3];
    }

  }

  //if n == nmax: update file
  if(n === this.N_SIMUL){
    this.graph_ts.updateOptions( { 'file': this.data_ts } );

    if(this.is_pred){
      this.graph_pred.updateOptions( { 'file': this.data_pred } );
      var prop_saved = [];
      for(var ts=0; ts<this.N_TS; ts++){
        prop_saved.push(((this.saved_cases[ts] / this.total_cases_no_intervention[ts])*100).toFixed(2));
      }
      this.saved_graph_updater(prop_saved);
    }
  }

};

SfrSimul.prototype.makeGraph = function(divGraph, vizSelector, label, data){

  var viz = [];
  $(vizSelector).each(function(){
    viz.push( ($(this).attr('checked')) );
  });

  var options={
    //	stepPlot: true,
    labels: ["time"].concat(label.map(function(x){return x.split('__').slice(0,2).join(' ')})),
    yLabelWidth: 50,
    xlabel: 'time (' + this.unit + ')',
    xLabelHeight: 12,
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

  var g = myDygraph(divGraph, data, options);

  var cols = d3.range(this.N_TS).map(d3.scale.category10());
  g.updateOptions({'colors': cols});

  return g;
};


SfrSimul.prototype.makeGraphPred = function(divGraph, vizSelector){

  var viz = [];
  $(vizSelector).each(function(){
    viz.push( ($(this).attr('checked')) );
  });

  for(var i=0; i<this.N_TS; i++){
    viz.push(viz[i]);
  }

  var fullLabels = ["time"].concat(this.ts_id.map(function(x){return x.split('__').slice(0,2).join(' ')}),
                                   this.ts_id.map(function(x){return 'prediction '+ x.split('__').slice(0,2).join(' ')}));

  var options={
    //	stepPlot: true,
    labels: fullLabels,
    yLabelWidth: 50,
    xlabel: 'time (' + this.unit + ')',
    xLabelHeight: 12,
    customBars:true,
    axisLabelFontSize:8,
    visibility: viz,
    digitsAfterDecimal:6,
    animatedZooms: true,
    labelsDivStyles:{'fontSize':'8pt', 'backgroundColor': 'transparent'},
    labelsSeparateLines: true,
    highlightCircleSize: 3,
    highlightSeriesOpts: {
      highlightCircleSize: 5,
    }
  };

  for(var i=0; i<this.N_TS; i++){
    //options[fullLabels[i+1]] = {strokePattern: Dygraph.DOT_DASH_LINE}; //MAKES DYGRAPH ON SAFARI SUPER SLOW...
    options[fullLabels[this.N_TS+i+1]] = {strokeWidth: 3};
  }

  var that = this;
  options['clickCallback']= function(e, x, pts) {
    that.indexDataClicked = x;
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
  g.updateOptions({'colors': cols});

  g.updateOptions({'colors': cols.concat(cols)});

  return g;
};


SfrSimul.prototype.updateiSettings = function(){
  //extend grouping, place hat values in guess and transform pop size into proportion...

  var indexClicked= this.indexDataClicked-1;

  //get the population size at time t (pop_size_t)

  var p_t = this.iSettings.data.par_fixed_values.p_t;

  if (p_t) {

    var pop_size_t = p_t[indexClicked];

  } else if (this.iSettings.POP_SIZE_EQ_SUM_SV) {

    var pop_size_t = [];

    for(var cac=0; cac< this.N_CAC; cac++){
      var sum_sv = 0.0;
      for(var p=0; p< this.N_PAR_SV; p++){
        sum_sv += this.states[p*this.N_CAC+cac];
      }
      pop_size_t.push(sum_sv);
    }

  } else {

    var pop_size_t = this.iSettings.data.pop_size_t0;

  }


  //put states into iSettings (and ensure variable grouping)

  var arrayify = function(obj){
    var tab = [];
    for(x in obj) {tab.push(obj[x])};
    return tab;
  }

  var group = this.sfrSettings.partition.variable_population.group; //note the sfrSettings, not iSettings

  var that = this;
  var offset = 0;
  this.sfrSettings.orders.par_sv.forEach(function(par, i){ //note that we loop using the par_sv of sfrSettings, not iSettings
    var par_object = that.sfrSettings.parameters[par];

    var pmin = Math.min.apply( Math, arrayify(par_object.min));
    var pmax = Math.max.apply( Math, arrayify(par_object.max));
    var psd =  Math.min.apply( Math, arrayify(par_object.sd_transf));

    par_object = that.iSettings.parameters[par];

    par_object.guess = {};
    par_object.min = {};
    par_object.max = {};
    par_object.sd_transf = {};

    group.forEach(function(g, cac) {
      par_object.guess[g.id] = that.states[indexClicked][offset]/pop_size_t[cac];
      par_object.min[g.id] = pmin;
      par_object.max[g.id] = pmax;
      par_object.sd_transf[g.id] = psd;
      offset++;
    });
    par_object.partition_id = 'variable_population';

  });

  return this.iSettings;
};


SfrSimul.prototype.resetForecast = function(){
  this.data_pred = this.set_data_pred();

  this.graph_pred.updateOptions( { 'file': this.data_pred,
                                   'underlayCallback': function(canvas, area, g) {
                                     canvas.fillStyle = "rgba(255, 255, 255, 1)";
                                     canvas.fillRect(area.x, area.y, area.w, area.h);
                                   }});
  this.graph_pred.resize();
};


function graphD32(data){
  //data is an array of data in percent ([0-100]): e.g [10, 23.1, 9, 75]

  $('#dangerous-intervention').hide();

  var margin = 15;
  var width = 300;
  var height = 15*data.length+margin;

  var chart = d3.select("svg")
    .attr("class", "chart")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + margin + "," + margin +")");

  d3.select("#tab-graph-forecasting-control").append('div')
    .attr('id', 'sfrboxsave') //div that will contain the caption (position will be adjusted)
    .style('position', 'absolute')
    .style("display", "none");

  var co = d3.scale.category10().domain(d3.range(data.length));
  var cols = function(d, i) {
    if (d <=100) {
      return co(i);
    } else {
      return 'red';
    }
  };

  var x = d3.scale.linear()
    .domain([0, 100])
    .range([0, width - 2*margin]);
  var safe_x = function(d,i){
    if(d>0) {
      return x(d);
    } else {
      return 0;
    }
  };

  var y = d3.scale.ordinal()
    .domain(d3.range(data.length))
    .rangeBands([0, height-margin-1]);

  chart.selectAll("rect")
    .data(data)
    .enter().append("rect")
    .attr("y", function(d,i) {return y(i)})
    .attr("width", safe_x)
    .attr("height", y.rangeBand())
    .style("fill", cols)
    .style("stroke-width", 2)
    .style("stroke", 'black');

  chart.selectAll("rect")
    .on('mouseover', function(d,i){
      var sfrboxsave = d3.select("#sfrboxsave");
      var position = $('svg').position();
      sfrboxsave.style("display", null);
      sfrboxsave.style("left", (position.left+ ((d<0) ? 0 : x(d)) +20) + "px" );
      sfrboxsave.style("top", (position.top +12 + i * y.rangeBand()) + "px");
      sfrboxsave.html(d + '%');
    });
  chart.selectAll("rect")
    .on('mouseout', function(d,i){
      d3.select("#sfrboxsave").style('display', 'none');
    });

  //add lines
  chart.selectAll("line")
    .data(x.ticks(10))
    .enter().append("line")
    .attr("x1", x)
    .attr("x2", x)
    .attr("y1", 0)
    .attr("y2", height)
    .style("stroke", "#ccc")
    .style("stroke-width", 0.8);

  //caption (xlabel)
  chart.selectAll(".rule")
    .data(x.ticks(5))
    .enter().append("text")
    .attr("class", "rule")
    .attr("x", x)
    .attr("y", 0)
    .attr("dy", -3)
    .attr("text-anchor", "middle")
    .text(String);

  //yaxis on the left
  chart.append("line")
    .attr("y1", 0)
    .attr("y2", height-margin)
    .style("stroke", "#000");

  return function(newData){

    chart.selectAll("rect")
      .data(newData)
      .transition()
      .duration(250)
      .attr("width", safe_x)
      .style("fill", cols);

    if(newData.some(function(el) {return (el < -5.0)})) { //NOTE: limit is 5% (should be 0 but numerical issues and stochastic)
      $('#dangerous-intervention').show();
    } else {
      $('#dangerous-intervention').hide();
    }
  }

}
