var plomGlobal = {canRun: true, intervalId:[]};

$(document).ready(function() {

  $('#reviewTab a[href=#forecast]').tab('show');
  $('#reviewModelTab a[href=#review-context]').tab('show');

  $.getJSON('/review', function(data) {

    $.getJSON('/diagnostic/'+ data.comps.thetas[0]._id + '/'+ data.comps.thetas[0].trace_id, function(diagnostic) {

      var plomPred =  new PlomPred({
        context: data.comps.context,
        process: data.comps.process,
        link: data.comps.link,
        X: diagnostic.X,
        theta: data.comps.thetas[0],
        graphTrajId: 'graphTrajPred',
        graphStateId: 'graphStatePred'
      });


      $("#resetPred").on('click', function(){
        plomPred.reset();
      });


    ///////////
    //websocket
    ///////////
    try{
      var socket = io.connect();
      console.log("websocket OK !");
    }
    catch(e){
      console.log("Can't connect to the websocket server !!");
      var socket = null;
    };

    if(socket) {

      //set all callbacks
      socket.on('connect', function () {

        socket.on('filter', function (msg) {
          plomPred.processMsg(msg);
        });

        socket.on('info', function (msg) {
          console.log(msg.msg);
        });

        socket.on('theEnd', function (msg) {
          //remove actions set with setInterval
          for(var i=0; i<plomGlobal.intervalId.length; i++){
            clearInterval(plomGlobal.intervalId.pop());
          }
          plomPred.updateGraphs();
          plomGlobal.canRun = true;
        });

      });

      $('#stop').click(function(){
        socket.emit('killme', true);
      });

      $("#run").click(function(){
        if(plomGlobal.canRun){
          plomGlobal.canRun = false;
          plomPred.run(socket, {impl:'ode'});
        }
      });

    } //if socket



    }); //AJAX diagnostic
  }); //AJAX review

});
