$(document).ready(function() {
  $('#follow').on('submit', function(e){
    e.preventDefault();

    var $this = $(this)
      , $input = $this.find( 'input[name="action"]' );

    var action = $input.val();

    $.post($this.attr('action'), $this.serialize(), function(status){

      if(status.success){
        if(action === 'follow'){
          $input.val('unfollow');
          $this.find('span').html('Unfollow');
        } else {
          $input.val('follow');
          $this.find('span').html('Follow');
        }
      }
    });

  });

});
