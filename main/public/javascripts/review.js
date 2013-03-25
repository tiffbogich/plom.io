var plomGlobal = {canRun: true, intervalId:[]};


$(document).ready(function() {

  $.getJSON('/review', function(data) {

    var c = data.comps.context
      , p = data.comps.process
      , l = data.comps.link
      , t = data.comps.thetas;

    var compiled = _.template(data.tpl.control);

    $('#control').html(compiled({c:c, p:p, l:l, t:t[0]}));

    //start with Parameter tab
    $('#reviewTab a[href=#theta]').tab('show');

    var plomTs = new PlomTs({
      context:c,
      process:p,
      link:l,
      theta:t[0],
      graphTrajId: 'graphTraj',
      graphStateId: 'graphState',
      graphLikeId: "graphLike"
    });


    console.log(t[0].diagnostic);
    parMatrix(t[0].diagnostic.detail);

    var compiled = _.template(data.tpl.summaryTable);
    $('#summaryTable').html(compiled(t[0].diagnostic));



//    console.log(t[0].diagnostic[0][0][0].png);
//    for(var x=0; x<t[0].diagnostic[0].length; x++ ){
//      $('body').append('<img src="' + '/trace/' + t[0].diagnostic[0][x][x].png.autocor_id + '"/>');
//    }


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
          plomTs.run(socket, {method:'smc', implementation: 'psr', J:100});
        }
      });

    } //if socket


  });


});
