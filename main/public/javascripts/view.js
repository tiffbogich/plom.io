function Control(){
  this.ONE_YEAR_IN_DATA_UNIT = {D:365.0, W:365.0/7.0, M:12.0, Y:1.0 };
  this.fhr = {D: 'days', W: 'weeks', M: 'months', Y: 'years'};
  this.algo2filter = {mif: 'smc', kalman: 'kalman', kmcmc: 'kalman', smc: 'smc', pmcmc: 'smc', simul: 'simul', simplex: 'smc', ksimplex: 'kalman'};
}

Control.prototype.method = function(context, design){

    var cmd = _.last(design.cmd);
    var opt = cmd.algorithm.split(' ').filter(function(x) {return (x !== ' ');});

    var optAlgo = this.algo2filter[opt[0]] || 'smc';
    var optImpl = opt[1];
    //force SDE for kalman
    if(optAlgo === 'kalman') optImpl = 'kalman';

    //default value if not specified by design
    var optJ = 1000, optS = 0.25/365.0 * this.ONE_YEAR_IN_DATA_UNIT[context.frequency];
    
    if(opt.indexOf('-J') !== -1){
      optJ = opt[opt.indexOf('-J') + 1]; 
    }
    if(opt.indexOf('-s') !== -1){
      optS = opt[opt.indexOf('-s') + 1]; 
    }
    if(opt.indexOf('-DT') !== -1){
      optS = opt[opt.indexOf('-DT') + 1]; 
    }

    //render    
    $('#optAlgo').val(optAlgo);
    $('#optImpl').val(optImpl);
    $('#optJ').val(optJ);
    $('#optS')
      .val(optS)
      .next('span').html(this.fhr[context.frequency]);

    //kalman can only be used with sde
    $('#optAlgo').on('change', function(e){
      if($(this).val() === 'kalman') {
        $('#optImpl').val('sde');
      }
    });

    $('#optImpl').on('change', function(e){
      if($('#optAlgo').val() === 'kalman' && $(this).val() !== 'sde') {
        $(this).val('sde');
      }
    });

};

Control.prototype.getMethod = function(){

  return {
    impl: $('#optImpl').val(),
    algo: $('#optAlgo').val(),
    J: parseInt($('#optJ').val(), 10),
    s: parseFloat($('#optS').val())
  };

};

Control.prototype.theta = function(theta, plomTs){

  $('input.theta').on('change', function() {
    var myName = $(this).attr('name').split('___')
      , prop = myName[0]
      , par = myName[1]
      , group = myName[2]
      , newValue = parseFloat($(this).val());

    theta.value[par][prop][group] = newValue;

    if(prop === 'guess'){
      $('#run').trigger('click');
    }
  });

  $('input.theta')
    .on('click', function() {
      if($(this).hasClass('guess')){

        var myName = $(this).attr('name').split('___')
        , prop = myName[0]
        , par = myName[1]
        , group = myName[2]
        , guess = parseFloat($(this).val());

        var min = parseFloat($('input.theta[name="' + ['min', par, group].join('___') + '"]').val())
          , max = parseFloat($('input.theta[name="' + ['max', par, group].join('___') + '"]').val());

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
      plomTs.graphTraj.setVisibility(parseInt($(this).val(), 10), $(this).is(':checked'));
      plomTs.graphTraj.setVisibility(plomTs.N_TS+parseInt($(this).val(), 10), $(this).is(':checked'));
    })
    .trigger('change');

  $('input.tick_state')
    .on('change', function(){
      plomTs.graphState.setVisibility(parseInt($(this).val(), 10), $(this).is(':checked'));
    })
    .trigger('change');

  $('input.tick_predRes')
    .on('change', function(){
      plomTs.graphPredRes.setVisibility(parseInt($(this).val(), 10), $(this).is(':checked'));
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
