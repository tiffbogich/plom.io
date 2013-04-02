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
      $(this).next()
        .html('run')
        .data({theta: $.extend(true, {}, ctrl.theta), method: ctrl.getMethod()})
        .next().show();
    });

    $(".vizbitLink").on('click', function(){
      var vdata = $(this).data();
      ctrl.updateTheta(vdata.theta, vdata.method);
      $("#run").trigger('click');
    });

    $("#vizbitRemove").on('click', function(e){
      e.preventDefault();
      $(this).hide().prev().html('').removeData();
    });

    ////////
    //social
    ////////
    $('#feedbackThread').html(ctrl.compiled.reviews({reviews:[{body:'adsdsdsd', decision:'validate', _id:1}, {body:'adsdsdsd', decision:'validate', _id:2}]}));

    $('button[type="submit"]').on('click', function(e){
      e.preventDefault();

      var $this = $(this);

      var pdata = {
        theta_id: ctrl.theta._id,
        accept: $this.val(),
        body: $('#feedbackTheta').val()
      };

      var vdata = $('#vizbit').next().data();

      if(vdata && 'theta' in vdata){
        pdata.theta = vdata.theta,
        pdata.method = vdata.method
      }

      var url = $this.closest('form').attr('action');
      $.post(url, pdata, function(reviews){
        $('#feedbackThread').html(ctrl.compiled.reviews({reviews:reviews}));
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
