$(document).ready(function() {

  $('.inlinesparkline').sparkline('html', {
    type:'box',
    boxLineColor:'grey',
    boxFillColor:'grey',
    whiskerColor: 'grey',
    outlierLineColor: 'grey',
    outlierFillColor: 'grey',
    medianColor: 'red',
    lineColor: 'grey',
    fillColor: false,
//    width:'100px',
//    spotRadius: 40,
    tooltipFormatFieldlist: ['med', 'lq', 'uq'],
    tooltipFormatFieldlistKey: 'field'
  }); 

  $('.app-folders-container').appFolders();

  $('.ts-picker, .followContext, .context-graph, .social-action').click(function(e){
    e.stopPropagation();
  });

  $('.plom-tooltip').tooltip({delay: { show: 100, hide: 100 }});
  

  $('.context-graph').each(function(){
    var _id = $(this).attr('id').split('_')[1];

    $.getJSON('/component/' + _id , function(data) {
      data = data.data;
      data.forEach(function(x, i){
        x[0] = new Date(x[0]);
      });

      var g = new Dygraph($('#graph_' + _id)[0], data, {
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
       
      $("#tsPicker_" + _id).on('change', function(e){
        var val = parseInt($(this).val(), 10);

        for(var i=0; i< data[0].length-1; i++){
          g.setVisibility(i, (val!==-1 && i!==val) ? false : true);
        };
      });

    });    
  });



  $('.process-graph').each(function(){
    var _id = $(this).attr('id').split('_')[1];
    $.getJSON('/component/' + _id , function(process) {
      plomGraphModel(process, "#pgraph_" + _id);
    });
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
