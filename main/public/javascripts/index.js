$(document).ready(function() {

  $('.app-folders-container').appFolders();

  $('.ts-picker, .followContext, .context-graph, .social-action').click(function(e){
    e.stopPropagation();
  });

  $.getJSON('/library', function(ctree) {

    ctree.forEach(function(c, indc){

      var data = c.data;

      data.forEach(function(x, i){
        x[0] = new Date(x[0]);
      });

      c['graph'] = new Dygraph($("#graphdiv" + indc)[0], data,
                               {
                                 drawXGrid: false,
                                 drawYGrid: false,
                                 animatedZooms: true,
                                 axisLineColor:'white',
                                 drawYAxis:false,
                                 showLabelsOnHighlight:false,
                                 highlightSeriesOpts: {
                                   strokeWidth: 2
                                 },
                                 showRoller:false,
                                 colors:['grey']
                               });

      c.model.forEach(function(m){
        plomGraphModel(m.process, "#pgraph"+m.link._id);
      });

    });

    $(".ts-picker").on('change', function(e){
      var indc = parseInt($(this).attr('id').split('-')[2], 10)
        , val = parseInt($(this).val(), 10);

      for(var i=0; i< ctree[indc].data[0].length-1; i++){
        ctree[indc].graph.setVisibility(i, (val!==-1 && i!==val) ? false : true);
      };

    });

    $('.plom-tooltip').tooltip({delay: { show: 100, hide: 100 }});

  });



  $('.followContext').on('submit', function(e){
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
