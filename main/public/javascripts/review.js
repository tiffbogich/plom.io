var plomGlobal = {canRun: true, intervalId:[]};

$(document).ready(function() {

  $('#reviewTab a[href=#theta]').tab('show');
  $('#reviewModelTab a[href=#review-context]').tab('show');
  $('a[rel=tooltip]').tooltip();

  $.getJSON('/review', function(data) {

    var ctrl = new Control(data);

    ctrl.thetaList();
    ctrl.summaryTable();
    ctrl.updateTheta(ctrl.theta, ctrl.theta.design.cmd);

    $('.review-theta').first().trigger('click');

    ////////
    //vizbit
    ////////
    $("#vizbit").on('click', function(){
      ctrl.setVizBit();

      $(this).next()
        .html('run')
        .next().show();
    });

    $(".vizbitLink").on('click', function(){
      var vdata = ctrl.vizBit;
      ctrl.updateTheta(vdata.theta, vdata.method);
      $("#run").trigger('click');
    });

    $("#vizbitRemove").on('click', function(e){
      ctr.vizBit = undefined;
      e.preventDefault();
      $(this).hide().prev().html('');
    });



    ////////
    //social
    ////////
    $.get('/reviewstheta/'+ ctrl.theta._id, function(reviews) {
      $('#reviewThread').html(ctrl.compiled.reviews(reviews));
    });


    $('#formReviewTheta').on('submit', function(e){
      e.preventDefault();

      var $this = $(this)
        , $body = $this.find( 'textarea[name="body"]' );

      var pdata = {
        theta_id: ctrl.theta._id,
        decision: $this.find( 'input[name="decision"]:checked' ).val(),
        body: $body.val(),
        _csrf: $this.find( 'input[name="_csrf"]' ).val(),
      };

      $body.val('');

      var vdata = ctrl.vizBit;
      if(vdata && 'theta' in vdata){
        pdata.theta = vdata.theta,
        pdata.method = vdata.method
      }

      var url = $this.closest('form').attr('action');
      $.post(url, pdata, function(reviews){
        $('#reviewThread').html(ctrl.compiled.reviews(reviews));
      });
    });


    $('#reviewThread').on('submit', 'form', function(e){
      e.preventDefault();

      var $this = $(this)
        , $body = $this.find( 'textarea[name="body"]' );

      var pdata = {
        review_id: $this.find( 'input[name="review_id"]' ).val(),
        decision: $this.find( 'input[name="decision"]:checked' ).val(),
        change: $this.find( 'input[name="change"]:checked' ).val(),
        body: $body.val(),
        _csrf: $this.find( 'input[name="_csrf"]' ).val()
      };

      $body.val('');

      var url = $this.closest('form').attr('action');
      $.post(url, pdata, function(reviews){
        $('#reviewThread').html(ctrl.compiled.reviews(reviews));
      });
      
    });


    $('#followContext').on('submit', function(e){
      e.preventDefault();

      var $this = $(this)
        , $btn = $this.find( 'button[name="action"]' );

      var pdata = {
        action: $btn.val(),
        context_id: ctrl.context._id,
        name: ctrl.context.disease.join('; ') + ' / ' +  ctrl.context.name,
        _csrf: $this.find( 'input[name="_csrf"]' ).val()
      };

      $.post($this.attr('action'), pdata, function(status){
        if(status.success){
          if(pdata.action === 'follow'){
            $btn.val('unfollow');
            $this.find('span').html('Unfollow Context');
          } else {
            $btn.val('follow');
            $this.find('span').html('Follow Context');
          }
        }
      });
      
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

      $('#stop').click(function(){
        socket.emit('killme', true);
      });

      $("#run").click(function(){
        if(plomGlobal.canRun){
          plomGlobal.canRun = false;
          ctrl.plomTs.run(socket, ctrl.getMethod());
        }
      });

    } //if socket

  }); //AJAX review

});
