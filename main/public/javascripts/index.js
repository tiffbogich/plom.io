$(document).ready(function() {

  $('.app-folders-container').appFolders();
  
  $('.context-graph').click(function(e){
    e.stopPropagation();
  });


  $.getJSON('/', function(ctree) {

    ctree.forEach(function(c, indc){

      var data = ctree[0].data;
      
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
                                   strokeWidth: 3,
                                   highlightCircleSize: 5,
                                 },
                                 showRoller:false,
                                 colors:['grey']
                               });
      
      c.model.forEach(function(m){
        plomGraphModel(m.process, "#pgraph"+m.process._id);
      });      

    });
    
    $(".ts-picker").on('change', function(e){
      var indc = parseInt($(this).attr('id').split('-')[2], 10)
        , val = parseInt($(this).val(), 10);
      
      for(var i=0; i< ctree[indc].data[0].length-1; i++){                
        ctree[indc].graph.setVisibility(i, (val!==-1 && i!==val) ? false : true);        
      };

    });

  });

});
