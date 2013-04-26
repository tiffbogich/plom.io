$(document).ready(function() {

  $('#requests a:first').tab('show');

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

