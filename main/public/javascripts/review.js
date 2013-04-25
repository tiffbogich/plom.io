var plomGlobal = {canRun: true, intervalId:[]};

$(document).ready(function() {



  $('#reviewTab a[href=#prior]').tab('show');
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

        var ctrl = new Control(data, plomTs);

        greenlights(summaries, ctrl.compiled.summaryCoda, function(summary, i){
          $.publish('trace', [summary.theta_id, summary.trace_id]);
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
          $.publish('trace', [theta_id, trace_id]);
          $.publish('theta', [theta_id, trace_id]);
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
              ctrl.plomTs.processMsg(msg);
            });

            socket.on('info', function (msg) {
              console.log(msg.msg);
            });

            socket.on('theEnd', function (msg) {
              //remove actions set with setInterval
              for(var i=0; i<plomGlobal.intervalId.length; i++){
                clearInterval(plomGlobal.intervalId.pop());
              }
              ctrl.plomTs.updateGraphs();
              plomGlobal.canRun = true;
            });

          });

          $("#control").on('click', '.stop', function(){
            socket.emit('killme', true);
          });

          $("#control").on('click', '.run', function(){
            if(plomGlobal.canRun){
              plomGlobal.canRun = false;
              ctrl.plomTs.run(socket, ctrl.getMethod());
            }
          });

        } //if socket

      }); //AJAX review
    })
  })
});
