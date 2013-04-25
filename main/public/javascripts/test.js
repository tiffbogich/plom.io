//var plomGlobal = {canRun: true, intervalId:[]};

$(document).ready(function() {

  $('#reviewTab a[href=#forecast]').tab('show');

  $.getJSON('/review', function(data) {

    console.log('/diagnostic/'+ data.model.theta._id + '/'+ data.model.theta.trace_id);
    $.getJSON('/diagnostic/'+ data.model.theta._id + '/'+ data.model.theta.trace_id, function(diagnostic) {

      $.getJSON('/forecast/'+ data.model.link._id + '/'+ data.model.theta._id + '/'+ data.model.theta.trace_id, function(forecast) {
        console.log('/forecast/'+ data.model.link._id + '/'+ data.model.theta._id + '/'+ data.model.theta.trace_id);

        console.log(diagnostic);

        var plomPred =  new PlomPred({
          context: data.model.context,
          process: data.model.process,
          link: data.model.link,
          X: diagnostic.X,
          theta: data.model.theta,
          theta_id: data.model.theta._id,
          trace_id: data.model.theta.trace_id,
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

            socket.on('simul', function (msg) {
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

          $('#stopPred').click(function(){
            socket.emit('killme', true);
          });

          $("#runPred").click(function(){
            if(plomGlobal.canRun){
              plomGlobal.canRun = false;
              plomPred.run(socket, {impl:'ode'});
            }
          });

        } //if socket


      }); //AJAX forecast
    }); //AJAX diagnostic
  }); //AJAX review

});
