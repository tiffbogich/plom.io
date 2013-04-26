var plomGlobal = {canRun: true, intervalId:[]};

$(document).ready(function() {

  $('#reviewTab a[href=#review]').tab('show');
//  $('#review a[href=#reviewReview]').tab('show');


  $('a[data-toggle="tooltip"]').tooltip();

  $.getJSON('/review', function(data) {
    var model = data.model
      , tpl = data.tpl;

    plomGraphModel(model.process, "#pgraph"+ model.link._id);

    var reviewer = new Reviewer(tpl['reviewer']);

    $('#priors, #review, #posterior').on('submit', '.post', function(e){
      e.preventDefault();     
      reviewer.post($(this));
    });

    ['prior', 'posterior', 'reaction', 'observed'].forEach(function(type){
      $('.' + type).on("show",function(e){
        e.stopPropagation();
        $.publish(type, $(this).attr('id'));
      });
    });


    $.getJSON('/diagnostic/'+ model.result.theta._id, function(summaries) {
      $.getJSON('/diagnostic/'+ model.result.theta._id + '/'+ model.result.theta.trace_id, function(diagnostic) {
        var updateCorr1 = plotCorr(diagnostic.detail, 0, 1, 1)
          , updateCorr2 = plotCorr(diagnostic.detail, 1, 0, 2)
          , updateDensity1 = plotDensity(diagnostic.detail, 0, 1)
          , updateDensity2 = plotDensity(diagnostic.detail, 1, 2)
          , updateTrace = plotTrace(diagnostic.detail, 0, 1)
          , updateAutocorr = plotAutocorr(diagnostic.detail,0,1)
          , updateMat = parMatrix(diagnostic.detail, updateCorr1, updateCorr2, updateDensity1, updateDensity2, updateTrace, updateAutocorr);

        var plomTs = new PlomTs({
          context: model.context,
          process: model.process,
          link: model.link,
          theta: model.result.theta,
          X: diagnostic.X,
          graphTrajId: 'graphTraj',
          graphStateId: 'graphState',
          graphPredResId: "graphPredRes",
          graphEssId: "graphEss"
        });

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





        var ctrl = new Control(data, plomTs);

        var updateGreenlights = greenlights(summaries, ctrl.compiled.summaryCoda, function(summary, i){
          $.publish('trace', [summary.theta_id, summary.trace_id]);
        });

        $.subscribe('theta', function(e, theta_id) {
          $.getJSON('/diagnostic/'+ theta_id, function(summaries) {
            updateGreenlights(summaries);
          });
        });

        $.subscribe('trace', function(e, theta_id, trace_id) {
          // Skip the first argument (event object)

          //TODO: update function for greenlights (add/remove dots...)

          $.getJSON('/diagnostic/'+ theta_id + '/'+ trace_id, function(diagnostic) {
            updateMat(diagnostic.detail);
            $.getJSON('/component/'+ theta_id + '/'+ trace_id, function(result) {
              plomTs.update(result.theta, diagnostic.X);
              ctrl.update(result);
            });
          });

        });

        //start !
        $('.review-theta').on('click', function(e){
          var theta_id = $(this).val();
          var trace_id = model.thetas.filter(function(x){return x.theta_id === theta_id})[0].trace_id;
          $('#idReviewTheta').val(theta_id);
          $.publish('theta', [theta_id, trace_id]);
          setTimeout(function(){
            $.publish('trace', [theta_id, trace_id]);
          }, 600);
        })
          .first()
          .trigger('click');
        

//    ////////
//    //vizbit
//    ////////
//    $("#rowReviewTheta").on('click', '.vizbit',  function(e){
//      e.preventDefault();
//
//      $('.vizbitRemove').trigger('click');
//
//      ctrl.setVizBit();
//      $(this).next()
//        .html('run')
//        .next().show();
//    });
//
//    $("#rowReviewTheta").on('click', '.vizbitLink',  function(e){
//      e.preventDefault();
//
//      var vdata = ctrl.vizBit;
//      ctrl.updateTheta(vdata.theta, vdata.method);
//      $("#run").trigger('click');
//    });
//
//    $("#rowReviewTheta").on('click', '.vizbitRemove',  function(e){
//      e.preventDefault();
//
//      ctrl.vizBit = undefined;
//      $(this).hide().prev().html('');
//    });
//
//
//    $('#rowReviewTheta').on('submit', function(e){
//      $('.vizbitRemove').trigger('click');
//    });
//
//    $('#rowReviewTheta').on('click', '.vizbitFetch',  function(e){
//      e.preventDefault();
//      var $this = $(this);
//
//      $.getJSON($this.attr('href'), function(vdata){
//        ctrl.updateTheta(vdata.theta, vdata.method);
//
//        $('html, body').animate({
//          scrollTop: $($this.attr('data-view')).offset().top
//        });
//
//        $("#run").trigger('click');
//
//      });
//
//    });


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
              plomTs.processMsg(msg);
            });

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
              plomTs.updateGraphs();
              plomPred.updateGraphs();
              plomGlobal.canRun = true;
            });

          });

          $("#control").on('click', '.stop', function(){
            socket.emit('killme', true);
          });

          $("#control").on('click', '.run', function(){
            if(plomGlobal.canRun){
              plomGlobal.canRun = false;
              plomTs.run(socket, ctrl.getMethod());
            }
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

      }); //AJAX review
    })
  })
});
