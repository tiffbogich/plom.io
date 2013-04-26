$(document).ready(function() {

  $('#requests a:first').tab('show');
  $('a[href="#summary"]').tab('show');


  $.getJSON('/component/context_id', function(context){
    var data = [];
    for(var col=1; col< context.data[0].length; col++){
      data.push(context.data.map(function(row) {return [new Date(row[0]), row[col]] }));
    }
    plomHorizon(data);
  });



  $('#followContext').on('submit', function(e){
    e.preventDefault();

    var $this = $(this)
      , $btn = $this.find( 'button[name="action"]' );

    var pdata = {
      action: $btn.val(),
      context_id: $this.find( 'input[name="context_id"]' ).val(),
      name: $this.find( 'input[name="name"]' ).val(),
      _csrf: $this.find( 'input[name="_csrf"]' ).val()
    };

    $.post($this.attr('action'), pdata, function(status){
      if(status.success){
        if(pdata.action === 'follow'){
          $btn.val('unfollow');
          $this.find('span').html('Unfollow');
        } else {
          $btn.val('follow');
          $this.find('span').html('Follow');
        }
      }
    });

  });

});

