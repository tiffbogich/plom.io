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
      graphDiffusionId: 'graphDiffusion',
      graphLikeId: "graphLike"
    });


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

        socket.on('simul', function (msg) {
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
          if(plomTs.graph_drift){
            plomTs.graph_drift.updateOptions( { 'file': plomTs.data_drift } );
          }
          if(plomTs.data_ts){
            plomTs.graph_ts.updateOptions( { 'file': plomTs.data_ts } );
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
          run(socket, plomTs);
        }
      });

    } //if socket


  });


});
