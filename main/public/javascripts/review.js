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

    var theta = $.extend(true, {}, t[0]);

    var control = new Control();
    control.method(c, theta.design);
    control.theta(theta);

    var plomTs = new PlomTs({
      context: c,
      process: p,
      link: l,
      theta: theta,
      graphTrajId: 'graphTraj',
      graphStateId: 'graphState',
      graphLikeId: "graphLike"
    });

    $('.review-theta').on('click', function(e){
      var i = parseInt($(this).val(), 10);

      $('#summaryTable').html(compiled.summaryTable(t[i].diagnostic));      
      //force redraw of the correlation matrix as the number of parameters could have changed... TODO: improve update to avoid full redraw
      updateMat = parMatrix(t[i].diagnostic.detail[0], updateCorr1, updateCorr2, updateDensity1, updateDensity2);

      //when user select a trace:
      $('.review-trace-id').on('click', function(e){              

        theta = $.extend(true, {}, t[i]);

        var h = parseInt($(this).val(), 10);
        $('#control').html(compiled.control({c:c, p:p, l:l, t:theta}));        
        updateMat(theta.diagnostic.detail[h]);
        control.method(c, theta.design);
        plomTs.updateTheta(theta);

        $('#tickTraj').html(compiled.ticks({'names': plomTs.getTrajNames() , prefix: 'traj'}));
        $('#tickState').html(compiled.ticks({'names': plomTs.getStateNames() , prefix: 'state'}));

        control.theta(theta, plomTs);

      });

      $('.review-trace-id').first().trigger('click');

    });

    $('.review-theta').first().trigger('click');

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
            plomTs.updateGraphState();
          }
          if(plomTs.dataTraj){
            plomTs.updateGraphTraj();
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
          plomTs.run(socket, control.getMethod());
        }
      });

    } //if socket

  });


});
