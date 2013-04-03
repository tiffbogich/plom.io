function Control(data){

  this.compiled = {};
  for(var k in data.tpl){
    this.compiled[k] = _.template(data.tpl[k]);
  }

  this.context = data.comps.context;
  this.process = data.comps.process;
  this.link = data.comps.link;
  this.thetas = data.comps.thetas;
  this.i = 0; //the selected theta (among thetas)
  this.theta = this.thetas[this.i];

  this.plomTs = new PlomTs({
    context: this.context,
    process: this.process,
    link: this.link,
    theta: this.theta,
    graphTrajId: 'graphTraj',
    graphStateId: 'graphState',
    graphLikeId: "graphLike",
    graphPredResId: "graphPredRes",
    graphEssId: "graphEss"
  });

  //d3 plots
  this.updateCorr1 = plotCorr(this.theta.diagnostic.detail[0], 0, 1, 1);
  this.updateCorr2 = plotCorr(this.theta.diagnostic.detail[0], 1, 0, 2);
  this.updateDensity1 = plotDensity(this.theta.diagnostic.detail[0], 0, 1);
  this.updateDensity2 = plotDensity(this.theta.diagnostic.detail[0], 1, 2);

  this.updateMat = parMatrix(this.theta.diagnostic.detail[0], this.updateCorr1, this.updateCorr2, this.updateDensity1, this.updateDensity2); 

  this.ONE_YEAR_IN_DATA_UNIT = {D:365.0, W:365.0/7.0, M:12.0, Y:1.0 };
  this.fhr = {D: 'days', W: 'weeks', M: 'months', Y: 'years'};
  this.algo2filter = {mif: 'smc', kalman: 'kalman', kmcmc: 'kalman', smc: 'smc', pmcmc: 'smc', simul: 'simul', simplex: 'smc', ksimplex: 'kalman'};
};



Control.prototype.thetaList = function(){
  $('#thetaList').html(this.compiled.parameters({thetas: this.thetas}));

  var that = this;
  $('.review-theta').on('click', function(e){
    that.i = parseInt($(this).val(), 10);
    that.theta = $.extend(true, {}, that.thetas[that.i]);

    that.summaryTable();
    $('.review-trace-id').first().trigger('click');

    //force redraw of the correlation matrix as the number of parameters could have changed... TODO: improve update to avoid full redraw
    that.updateMat = parMatrix(that.theta.diagnostic.detail[0], that.updateCorr1, that.updateCorr2, that.updateDensity1, that.updateDensity2);
  });

};


Control.prototype.summaryTable = function(){
  $('#summaryTable').html(this.compiled.summaryTable(this.theta.diagnostic));

  var that = this;
  //when user select a trace:
  $('.review-trace-id').on('click', function(e){
    var h = parseInt($(this).val(), 10);
    that.updateTheta(that.thetas[that.i], that.thetas[that.i].design.cmd);
    that.updateMat(that.thetas[that.i].diagnostic.detail[h]);

  });

};

Control.prototype.updateTheta = function(theta, cmd){
  this.theta = $.extend(true, {}, theta);

  //render    
  $('#control').html(this.compiled.control({c:this.context, p:this.process, l:this.link, t:this.theta}));
  $('#tickTraj').html(this.compiled.ticks({'names': this.plomTs.getTrajNames() , prefix: 'traj'}));
  $('#tickState').html(this.compiled.ticks({'names': this.plomTs.getStateNames() , prefix: 'state'}));
  $('#tickPredRes').html(this.compiled.ticks({'names': this.plomTs.getTrajNames() , prefix: 'predRes'}));

  //attach listeners
  this._method(cmd);
  this._theta();

  //replot simulation and filters
  this.plomTs.updateTheta(this.theta);
};


Control.prototype.getMethod = function(){

  return {
    algo: $('#algo').val(),
    impl: $('#impl').val(),
    J: parseInt($('#J').val(), 10),
    s: parseFloat($('#s').val())
  };

};


/**
 * cmd is either an array  (design.cmd) or a method object as returned by this.getMethod()
 */
Control.prototype._method = function(cmd){

  var method = {}; 
  
  if(_.isArray(cmd)){
    cmd = _.last(cmd);
    var opt = cmd.algorithm.split(' ').filter(function(x) {return (x !== ' ');});

    method.algo = this.algo2filter[opt[0]] || 'smc';
    method.impl = (opt[1].indexOf('-') !== -1) ? opt[1] : 'sde';
    //force SDE for kalman
    if(method.algo === 'kalman') method.impl = 'sde';

    //default value if not specified by design
    method.J = 1000;
    method.s = 0.25/365.0 * this.ONE_YEAR_IN_DATA_UNIT[this.context.frequency];
    
    if(opt.indexOf('-J') !== -1){
      method.J = opt[opt.indexOf('-J') + 1]; 
    }
    if(opt.indexOf('-s') !== -1){
      method.s = opt[opt.indexOf('-s') + 1]; 
    }
    if(opt.indexOf('--DT') !== -1){
      method.s = opt[opt.indexOf('--DT') + 1]; 
    }
  } else {
    method = cmd;
  }


  //set method
  $('#algo').val(method.algo);
  $('#impl').val(method.impl);
  $('#J').val(method.J);
  $('#s')
    .val(method.s)
    .next('span').html(this.fhr[this.context.frequency]);

  //kalman can only be used with sde
  $('#algo').on('change', function(e){
    if($(this).val() === 'kalman') {
      $('#impl').val('sde');
    }
  });

  $('#impl').on('change', function(e){
    if($('#algo').val() === 'kalman' && $(this).val() !== 'sde') {
      $(this).val('sde');
    }
  });

};


Control.prototype._theta = function(){

  var that = this;
  var theta = this.theta;

  $('input.theta').on('change', function() {
    var myName = $(this).attr('name').split('___')
      , par = myName[0]
      , group = myName[1]
      , prop = myName[2]
      , newValue = parseFloat($(this).val());

    theta.parameter[par]['group'][group][prop]['value'] = newValue;

    if(prop === 'guess'){
      $('#run').trigger('click');
    }
  });

  $('input.theta')
    .on('click', function() {
      if($(this).hasClass('guess')){

        var myName = $(this).attr('name').split('___')
          , par = myName[0]
          , group = myName[1]
          , prop = myName[2]
          , guess = parseFloat($(this).val());

        var min = parseFloat($('input.theta[name="' + [par, group, 'min'].join('___') + '"]').val())
          , max = parseFloat($('input.theta[name="' + [par, group, 'max'].join('___') + '"]').val());

        var pos = $(this).position();
        pos.top -= 15;
        pos.left -= 80;

        if(min !== max) {
          $("#slider")
            .show()
            .css(pos)
            .slider("option", { min: min, max: max, value: guess, step: (max-min)/1000 })
            .data({name: $(this).attr('name')});
        } else {
          $("#slider").hide(100);
        }

      } else {
        $("#slider").hide(100);
      }
    });

  $( "#slider" ).slider({
    slide: function( event, ui ) {
      $('input.theta[name="' + $(this).data('name') +  '"]').val(ui.value);
    },
    stop: function( event, ui ) {
      $(this).hide(100);
      $('input.theta[name="' + $(this).data('name') +  '"]')
        .val(ui.value)
        .trigger('change');
    }
  });

  //graph visibility
  $('input.tick_traj')
    .on('change', function(){
      that.plomTs.graphTraj.setVisibility(parseInt($(this).val(), 10), $(this).is(':checked'));
      that.plomTs.graphTraj.setVisibility(that.N_TS+parseInt($(this).val(), 10), $(this).is(':checked'));
    })
    .trigger('change');

  $('input.tick_state')
    .on('change', function(){
      that.plomTs.graphState.setVisibility(parseInt($(this).val(), 10), $(this).is(':checked'));
    })
    .trigger('change');

  $('input.tick_predRes')
    .on('change', function(){
      that.plomTs.graphPredRes.setVisibility(parseInt($(this).val(), 10), $(this).is(':checked'));
    })
    .trigger('change');

  //colors tick boxs:
  var cols = d3.scale.category10();
  ['input.tick_traj', 'input.tick_state', 'input.tick_predRes'].forEach(function(el){
    $(el).parent().each(function(i){
      $(this).css('color', cols(i));
    });
  });

};


Control.prototype.setVizBit = function(){

  this.vizBit = {
    theta: $.extend(true, {}, this.theta),
    method: this.getMethod()
  };

};
