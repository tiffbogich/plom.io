var plomGlobal = {canRun: true, intervalId:[]};

$(document).ready(function() {

  $.getJSON('/review', function(data) {

    var c = data.comps.context
      , p = data.comps.process
      , l = data.comps.link
      , t = data.comps.thetas;

    //compile templates
    var compiled = {};
    for(var k in data.tpl){
      compiled[k] = _.template(data.tpl[k]);
    }


    $('#reviewTab a[href=#theta]').tab('show');
    $('#reviewModelTab a[href=#review-context]').tab('show');
    $('a[rel=tooltip]').tooltip();

    //start with the first parameter and first trace selected
    $('#theta-list').html(compiled.parameters(data.comps));
    $('#summaryTable').html(compiled.summaryTable(t[0].diagnostic));      
    $('#control').html(compiled.control({c:c, p:p, l:l, t:t[0]}));        

    var updateCorr1 = plotCorr(t[0].diagnostic.detail[0], 0, 1, 1)
      , updateCorr2 = plotCorr(t[0].diagnostic.detail[0], 1, 0, 2)
      , updateDensity1 = plotDensity(t[0].diagnostic.detail[0], 0, 1)
      , updateDensity2 = plotDensity(t[0].diagnostic.detail[0], 1, 2);

    var updateMat = parMatrix(t[0].diagnostic.detail[0], updateCorr1, updateCorr2, updateDensity1, updateDensity2); 


    $('.review-theta').on('click', function(e){
      var i = parseInt($(this).val(), 10);

      $('#summaryTable').html(compiled.summaryTable(t[i].diagnostic));      
      //force redraw of the correlation matrix as the number of parameters could have changed... TODO: improve update to avoid full redraw
      updateMat = parMatrix(t[i].diagnostic.detail[0], updateCorr1, updateCorr2, updateDensity1, updateDensity2);

      //when user select a trace:
      $('.review-trace-id').on('click', function(e){              
        var h = parseInt($(this).val(), 10);
        $('#control').html(compiled.control({c:c, p:p, l:l, t:t[i]}));        
        updateMat(t[i].diagnostic.detail[h]);
      });

    });

    console.log(t[0].diagnostic.detail);

    $('.review-theta').first().trigger('click');

    var plomTs = new PlomTs({
      context:c,
      process:p,
      link:l,
      theta:t[0],
      graphTrajId: 'graphTraj',
      graphStateId: 'graphState',
      graphLikeId: "graphLike"
    });


    var control = new Control();
    control.render(c, t[0].design);

//    $('input.plottedTs').change(function(){
//      plomTs.graph_ts.setVisibility(parseInt($(this).attr('name'), 10), $(this).attr('checked'));
//      plomTs.graph_ts.setVisibility(plomTs.N_TS+parseInt($(this).attr('name'), 10), $(this).attr('checked') );
//    });
//    $('input.plottedDrift').change(function(){
//      plomTs.graph_drift.setVisibility(parseInt($(this).attr('name'), 10), $(this).attr('checked'));
//    });
//
//    //colors tick boxs:
//    var cols = d3.scale.category10();
//    ['.plom-tick-simul', '.plom-tick-drift'].forEach(function(el){
//      $(el).each(function(i){
//        $(this).css('color', cols(i));
//      });
//    });




    $('input.theta').on('change', function() {
     
      var myName = $(this).attr('name').split('___')
        , prop = myName[0]
        , par = myName[1]
        , group = myName[2]
        , newValue = parseFloat($(this).val());

      t[0].value[par][prop][group] = newValue;

      if(prop === 'guess'){
        $('#run').trigger('click');
      }
    });


    $('input.guess')
      .on('click', function() {
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
        }

      })
      .on('focusout', function(){
        $("#slider")
          .hide();
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





    ////////////////////////////////////////////////////////////////////////////////////////
    //websocket
    ////////////////////////////////////////////////////////////////////////////////////////
    try{
      var socket = io.connect();
      console.log("websocket OK !");
    }
    catch(e){
      console.log("Can't connect to the websocket server !!");
      var socket = null;
    };

    if(socket) {

      socket.on('connect', function () {
        //set all callbacks

        socket.on('filter', function (msg) {
          plomTs.processMsg(msg);
        });

        socket.on('info', function (msg) {
          console.log(msg.msg);
        });

        socket.on('theEnd', function (msg) {

          //remove actions set with setInterval
          for(var i=0; i<plomGlobal.intervalId.length; i++){
            clearInterval(plomGlobal.intervalId.pop());
          }

          //be sure that the graph contain all the data (the graph is only updated every x msgs)
          if(plomTs.graphState){
            plomTs.graphState.updateOptions( { 'file': plomTs.dataState } );
          }
          if(plomTs.dataTraj){
            plomTs.graphTraj.updateOptions( { 'file': plomTs.dataTraj } );
          }

          plomGlobal.canRun = true;

        });

      });

      ////////////////////////////////////////////////////////////////////////////////////////
      //action!
      ////////////////////////////////////////////////////////////////////////////////////////
      $('#stop').click(function(){
        socket.emit('killme', true);
      });

      $("#run").click(function(){
        if(plomGlobal.canRun){
          plomGlobal.canRun = false;
          plomTs.run(socket, control.get());
        }
      });

    } //if socket

  });


});
