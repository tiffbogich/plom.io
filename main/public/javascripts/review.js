var plomGlobal = {canRun: true, intervalId:[]};

$(document).ready(function() {

  $('#reviewTab a[href=#review]').tab('show');

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


    $.getJSON('/diagnostic/'+ model.result.theta._id, function(summaries) {
      $.getJSON('/diagnostic/'+ model.result.theta._id + '/'+ model.result.theta.trace_id, function(diagnostic) {
        var updateCorr1 = plotCorr(diagnostic.detail, 0, 1, 1);
        var updateCorr2 = plotCorr(diagnostic.detail, 1, 0, 2);
        var updateDensity1 = plotDensity(diagnostic.detail, 0, 1);
        var updateDensity2 = plotDensity(diagnostic.detail, 1, 2);
        var updateTrace = plotTrace(diagnostic.detail, 0, 1);
        var updateAutocorr = plotAutocorr(diagnostic.detail,0,1);
        var updateMat = parMatrix(diagnostic.detail, updateCorr1, updateCorr2, updateDensity1, updateDensity2, updateTrace, updateAutocorr);


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

        var theta_id = model.result.theta._id;

        $.subscribe('trace', function(_, trace_id) {
          // Skip the first argument (event object) but log the name and other args.

          $.getJSON('/diagnostic/'+ theta_id + '/'+ trace_id, function(diagnostic) {
            updateMat(diagnostic.detail);
            $.getJSON('/component/'+ theta_id + '/'+ trace_id, function(result) {
              plomTs.update(result.theta, diagnostic.X);
              ctrl.update(result);
            });
          });


        });

        greenlights(summaries, ctrl.compiled.summaryCoda, function(summary, i){
          $.publish('trace', summary.trace_id);
        });

        $.publish('trace', model.result.theta.trace_id);



//
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
//
//
//    ////////
//    //social
//    ////////
//
//    //discussion
//    $('#model').on('submit', 'form.discuss', function(e){
//      e.preventDefault();
//
//      var $this = $(this)
//        , $body = $this.find( 'textarea[name="body"]' );
//
//      var url = $this.closest('form').attr('action');
//
//      var myid;
//      if(url.indexOf('pmodel') !== -1){
//        myid = '#discussPmodel'
//      } else if (url.indexOf('omodel') !== -1){
//        myid = '#discussOmodel'
//      } else {
//        myid = '#discussPrior'
//      }
//
//      var discussion_id = $this.find( 'input[name="discussion_id"]' ).val();
//      discussion_id = (myid !== '#discussPrior') ? parseInt(discussion_id, 10) : discussion_id;
//
//      var pdata = {
//        context_id: ctrl.context._id,
//        process_id: ctrl.process._id,
//        link_id: ctrl.link._id,
//        discussion_id: discussion_id,
//        name: ctrl.name,
//        body: $body.val(),
//        _csrf: $this.find( 'input[name="_csrf"]' ).val()
//      };
//
//      if(myid === '#discussPrior'){
//        pdata.theta_id = ctrl.theta._id;
//      }
//
//      $body.val('');
//
//      $.ajax(url, {
//        data : JSON.stringify(pdata),
//        contentType : 'application/json',
//        type : 'POST',
//        success: function(discussion){
//          console.log(discussion);
//          var sel = (myid === '#discussPrior') ? pdata.discussion_id.replace(/:/, '___') : pdata.discussion_id;
//          $(myid + '_' + sel).find('.thread').html(ctrl.compiled.discuss({discussion:discussion}));
//        }
//      });
//    });
//
//
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
