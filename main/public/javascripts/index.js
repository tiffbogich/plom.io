$(document).ready(function() {

  $('.app-folders-container').appFolders();
  
  $('.context-graph').click(function(e){
    e.stopPropagation();
  });


  $.getJSON('/', function(answer) {

    var data = answer.context[0].data;
    
    data.forEach(function(x, i){
      data[i] = [new Date(x[0]), x[1]];
    });

    for (var i=0; i<5; i++) {
      var g = new Dygraph($("#graphdiv" + i)[0], data,
                          {
                            drawXGrid: false,
                            drawYGrid: false,
                            animatedZooms: true,
                            axisLineColor:'white',
                            drawYAxis:false,
                            //yAxisLabelWidth:20,
                            showLabelsOnHighlight:false,
                            showRoller:false,
                            colors:['grey']
                          });
    };



    console.log(answer.process[0]);
    for (var i=0; i<10; i++) {
      plomGraphModel(answer.process[0], "#pgraph"+i);
    }
 


  });

});
