var plomGlobal = {canRun: true, intervalId:[]};

$(document).ready(function() {

  $('#reviewTab a[href=#prior]').tab('show');

  $('a[data-toggle="tooltip"]').tooltip();

  $.getJSON('/review', function(data) {

    var comps = data.comps
      , tpl = data.tpl;

    comps.theta = comps.thetas[0];

    plomGraphModel(comps.process, "#pgraph"+ comps.link._id);

    var reviewer = new Reviewer(tpl['reviewer'], comps, comps.theta);

    $('#priors, #review, #posterior').on('submit', '.post', function(e){
      e.preventDefault();     
      reviewer.post($(this));
    });

//    var ctrl = new Control(data);
//
//    ctrl.thetaList();
//    ctrl.updateTheta(ctrl.theta, ctrl.theta.design.cmd);
//
//    $('.review-theta').first().trigger('click');
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
//    ///////////
//    //websocket
//    ///////////
//    try{
//      var socket = io.connect();
//      console.log("websocket OK !");
//    }
//    catch(e){
//      console.log("Can't connect to the websocket server !!");
//      var socket = null;
//    };
//
//    if(socket) {
//
//      //set all callbacks
//      socket.on('connect', function () {
//
//        socket.on('filter', function (msg) {
//          ctrl.plomTs.processMsg(msg);
//        });
//
//        socket.on('info', function (msg) {
//          console.log(msg.msg);
//        });
//
//        socket.on('theEnd', function (msg) {
//          //remove actions set with setInterval
//          for(var i=0; i<plomGlobal.intervalId.length; i++){
//            clearInterval(plomGlobal.intervalId.pop());
//          }
//          ctrl.plomTs.updateGraphs();
//          plomGlobal.canRun = true;
//        });
//
//      });
//
//      $("#control").on('click', '.stop', function(){
//        socket.emit('killme', true);
//      });
//
//      $("#control").on('click', '.run', function(){
//        if(plomGlobal.canRun){
//          plomGlobal.canRun = false;
//          ctrl.plomTs.run(socket, ctrl.getMethod());
//        }
//      });
//
//    } //if socket
//
  }); //AJAX review

});
