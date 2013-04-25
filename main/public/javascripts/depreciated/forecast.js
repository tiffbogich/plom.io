//var plomGlobal = {canRun: true, intervalId:[]};

$(document).ready(function() {

  //$('#reviewTab a[href=#forecast]').tab('show');

  $.getJSON('/review', function(data) {

    $.getJSON('/diagnostic/'+ data.model.result.theta._id + '/'+ data.model.result.theta.trace_id, function(diagnostic) {
      $.getJSON('/forecast/'+ data.model.link._id + '/'+ data.model.result.theta._id + '/'+ data.model.result.theta.trace_id, function(forecast) {

        var plomPred =  new PlomPred({
          context: data.model.context,
          process: data.model.process,
          link: data.model.link,
          X: diagnostic.X,
          theta: data.model.result.theta,
          theta_id: data.model.result.theta._id,
          trace_id: data.model.result.theta.trace_id,
          graphTrajId: 'graphTrajPred',
          graphStateId: 'graphStatePred'
        });

        var ticker = _.template(data.tpl.ticks);
        $('#tickTrajPred').html(ticker({'names': plomPred.getTrajNames() , suffix: 'traj-pred'}));
        $('#tickStatePred').html(ticker({'names': plomPred.getStateNames() , suffix: 'state-pred'}));
        //graph visibility
        $('input.tick_traj-pred')
          .on('change', function(){
            plomPred.graphTraj.setVisibility(parseInt($(this).val(), 10), $(this).is(':checked'));
            plomPred.graphTraj.setVisibility(plomPred.N_TS+parseInt($(this).val(), 10), $(this).is(':checked'));
            plomPred.graphTraj.setVisibility(2*plomPred.N_TS+parseInt($(this).val(), 10), $(this).is(':checked'));
          })
          .trigger('change');

        $('input.tick_state-pred')
          .on('change', function(){
            plomPred.graphState.setVisibility(parseInt($(this).val(), 10), $(this).is(':checked'));
            plomPred.graphState.setVisibility(plomPred.allStateName.length + parseInt($(this).val(), 10), $(this).is(':checked'));
          })
          .trigger('change');

        //colors tick boxs:
        var cols = d3.scale.category10();
        ['input.tick_traj-pred', 'input.tick_state-pred'].forEach(function(el){
          $(el).parent().each(function(i){
            $(this).css('color', cols(i));
          });
        });

        $("#resetPred").on('click', function(){
          $("#stopPred").trigger('click');
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
