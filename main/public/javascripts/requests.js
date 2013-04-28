$(document).ready(function() {

  $('#requests a:first').tab('show');

  //get content
  $('#threads').load('/requests/threads');       

  //refresh and filter
  $('input:radio').change(function(){
    var type = $('input:radio[name="type"]:checked').val();
    $('#threads').load('/requests/threads' + ((type !== 'all') ? '/' + type : ''));       
  });


  //display the right forms (emulating radios)
  $('#addRequest button').on('click', function(e){
    var $this = $(this);
    var $activated = $('#addRequest button.active');
    if($activated.length){
      if($activated.attr('data-target') === $this.attr('data-target') ) {
        return $( $activated.removeClass('active').attr('data-target') ).collapse('hide');
      } else {
        $($activated.removeClass('active').attr('data-target')).collapse('hide');
      }
    }
    $( $this.toggleClass('active').attr('data-target') ).collapse('toggle');
  });


  $('#threads').on('click', 'button.resolve', function(e){
    var $this = $(this);
    $( $this.toggleClass('active').attr('data-target') ).collapse('toggle');
    if($this.attr('data-target').split('_')[0] === '#comment'){
      if( $($this.next().removeClass('active').attr('data-target')).hasClass('in')){
        $($this.next().attr('data-target')).collapse('hide');
      }
    } else {
      if( $($this.prev().removeClass('active').attr('data-target')).hasClass('in')){
        $($this.prev().attr('data-target')).collapse('hide');
      }
    }

  });


  //post
  $('body').on('submit', '.post', function(e){
    e.preventDefault();    
    var $form = $(this);       
    $.ajax($form.attr('action'), {
      data : $form.serialize(),
      type : 'POST',
      success: function(requests){
        //collapse form
        $('button[data-target=#' + $form.closest('.collapse').attr('id') + ']').trigger('click'); 
        //reset
        $form.find("input[type=text], textarea").val("");
        //set to all
        $('input:radio[name=type][value=all]').prop('checked', true);
        //refresh content
        $('#threads').html(requests);
      }
    });      
  });


  //horizon chart
  $.getJSON('/component/context_id', function(context){
    var data = [];
    for(var col=1; col< context.data[0].length; col++){
      data.push(context.data.map(function(row) {return [new Date(row[0]), row[col]] }));
    }
    plomHorizon(data);
  });


  //follow context
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

