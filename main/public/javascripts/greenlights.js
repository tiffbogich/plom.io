function greenlights(summaries, ftpl, callback){

  summaries[1].summary.passed=true;

  var essMax = Math.max.apply(Math, summaries.map(function(x){return x.summary.essMin;}));

  $('#greenlights svg').remove();
  var svg = d3.select("#greenlights").append("svg")
    .attr("width", 900)
    .attr("height", 60);  

  var g = svg.selectAll("g")
    .data(summaries)
    .enter().append("g")
    .attr("transform", function(d, i) { return "translate(" + (i*60+40) + "," + (34) + ")"; });

  var circle = g.append("circle")
    .attr("class", function(d){return (d.summary.passed) ?  'passed': 'failed';})
    .attr("r", function(d){return d.summary.essMin/essMax*20 +5 ;});

  g.append("text")
    .attr("dy", ".35em")
    .attr("text-anchor", "middle")
    .text(function(d){return Math.round(d.summary.essMin);});

  circle.on('mouseover', function(d, i){
    console.log(d);
    $('#summaryTable').html(ftpl({s:d.summary, summaries:summaries, h:i})).show();;
  })
  circle.on('mouseout', function(d, i){
    $('#summaryTable').hide();
  })


  circle.on('click', function(d, i){

    callback(d, i);

  })

}


