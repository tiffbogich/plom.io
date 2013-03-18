//////////////////////////////////////////////////////////////////////////////
//PlomBest
//////////////////////////////////////////////////////////////////////////////
function PlomBest(plomSettings, theta, divGraph, vizSelector, updatePlomSettings) {
  //to be improved: Best.prototype.makeGraph depends on things not defined in this file...

  this.bufferSize = 100;
  this.plomSettings = plomSettings; //just a ref
  this.theta = theta;

  var allParId = [];
  ['par_sv', 'par_proc', 'par_obs'].forEach(function(el){
    plomSettings.orders[el].forEach(function(p){
      var id = theta.value[p]['partition_id'];
      theta.partition[id]['group'].forEach(function(group, i){
        allParId.push(p + ' ' + group.id.split('__').slice(0,2).join(' '));
      });
    });
  });

  allParId.push('log likelihood');
  this.allParId = allParId;

  this.is_drift = (plomSettings.orders.drift_var.length > 0);

  this.data = this.set_data();
  this.graph = this.makeGraph(divGraph, vizSelector, updatePlomSettings);
};


PlomBest.prototype.processMsg = function(msg, appendLog){

  switch(msg.flag){

  case 'log':
    appendLog(msg.msg, false);
    break;

  case 'err':
    appendLog(msg.msg, true);
    break;

  case 'best':
    this.process_best(msg.msg);
    break;
  }
};


PlomBest.prototype.set_data = function(){
  //will contain the parameter values as a function of number of iterations:
  var data = [];
  data.push(new Array(this.allParId.length+1));
  for(var i=0; i< (this.allParId.length+1); i++){
    data[0][i] = null;
  }

  return data;
};

PlomBest.prototype.process_best = function(msg){
  var x;

  this.data.push(new Array(this.allParId.length+1));

  if(this.data.length >= this.bufferSize){
    this.data.splice(0,1);
    x = this.data.length -1;
  } else {
    x = msg[0]+1;
  }

  this.data[x] = msg.slice(0);//[msg[0], msg[msg.length-1]];
};

PlomBest.prototype.makeGraph = function(divGraph, vizSelector, updatePlomSettings){

  var viz = [];
  $(vizSelector).each(function(){
    viz.push( ($(this).attr('checked')) );
  });

  var options={
    //	stepPlot: true,
    labels: ["iterations"].concat(this.allParId),
    yLabelWidth: 50,
    customBars:false,
    axisLabelFontSize:8,
    visibility: viz,
    digitsAfterDecimal:6,
    //        animatedZooms: true,
    labelsDivStyles:{'fontSize':'8pt', 'backgroundColor': 'transparent'},
    labelsSeparateLines: true,
    highlightCircleSize: 3,
    highlightSeriesOpts: {
      strokeWidth: 3,
      strokeBorderWidth: 1,
      highlightCircleSize: 5,
    },
    xlabel: 'iterations'};

  var that = this;
  options['clickCallback']= this.onClickCalback();

  var g = myDygraph(divGraph, this.data, options);
  var cols = d3.range(this.allParId.length).map(d3.scale.category10());
  g.updateOptions({'colors': cols});

  return g;
};


PlomBest.prototype.onClickCalback = function() {
  var that = this;

  return function(e, x, pts) {
    //only if the user has done something..
    if (that.data.length > 1) {
      var x = x || that.data.length;

      //put values of best in parameters (DOM) and plomSettings

      var xx = x % that.bufferSize;
      xx = (xx < that.data.length) ? xx : xx-1;

      var $this;
      //we need to map x [1, M] into [ 0, that.bufferSize ]


      var offset = 0;
      ['par_sv', 'par_proc', 'par_obs'].forEach(function(el){
        that.plomSettings.orders[el].forEach(function(p){
          var id = that.theta.value[p]['partition_id'];
          that.theta.partition[id]['group'].forEach(function(group, i){

            var name = ['guess', p, group.id].join('___');
            $this = $('input.parameters[name="'+ name +'"]');
            $this.val(that.data[ xx ][offset+1]);
            updatePlomSettings(that.theta, $this);
            offset++;

          });
        });
      });
    }
  }
};
