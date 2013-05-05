$(document).ready(function(){

  $( "#reactions" ).sortable();

  //remove reactions
  $( "#reactions" ).on('click', '.remove-reaction', function(e){
    e.preventDefault();
    $(this).closest('li').remove();
  });



  $.getJSON('/template/model', function(tpl){

    var tplReaction = _.template(tpl['reaction']);

    $('#addReaction').on('click', function(e){
      e.preventDefault();
      $("#reactions").append(tplReaction({reactions:[{}]}));
    });


    $('a.fork').on('click', function(e){
      e.preventDefault();

      $.getJSON(this.href, function(p){

        //only merge non overlapping reactions

        var pmodel = $('.reaction').map(function(){
          var $form = $(this);            
          return [{
            from: $form.find('input[name="from"]').val(),
            to: $form.find('input[name="to"]').val(),
            rate: $form.find('input[name="rate"]').val()
          }];
        }).get()
          .filter(function(r){
            return r.from && r.to && r.rate;
          });
        
        var merge =[] 
        p.model.forEach(function(r){          
          var i;
          for(i=0; i< pmodel.length; i++){
            if( (pmodel[i].from === r.from) && (pmodel[i].to === r.to) && (pmodel[i].rate === r.rate)){
              break;
            }
          }
          if(i === pmodel.length){
            merge.push(r);
          }
        });

        $("#reactions").append(tplReaction({reactions:merge}));

      });

    });


  });

});
