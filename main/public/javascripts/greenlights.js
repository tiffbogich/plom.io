function greenlights(summaries, ftpl, callback){

  var essMax = Math.max.apply(Math, summaries.map(function(x){return x.summary.essMin;}));

  $('#greenlights svg').remove();
  var svg = d3.select("#greenlights").append("svg")
    .attr("width", 900)
    .attr("height", 60);

  var g = svg.selectAll("g")
    .data(summaries)
    .enter().append("g")
    .classed('trace-selected', function(d,i){ return i===0;})
    .attr("transform", function(d, i) { return "translate(" + (i*60+40) + "," + (34) + ")"; });

  var circle = g.append("circle")
    .attr("class", function(d){return (d.summary.passed) ?  'passed': 'failed';})
    .attr("r", function(d){return d.summary.essMin/essMax*20 +5 ;});

  var text = g.append("text")
    .attr("dy", ".35em")
    .attr("text-anchor", "middle")
    .text(function(d){return Math.round(d.summary.essMin);});


  var onClick = function(d, i){
    d3.select('g.trace-selected').classed('trace-selected', false);
    d3.select(this).classed('trace-selected', true);
    callback(d, i);
  }

  var onMouseover = function(d, i){
    $('#summaryTable').html(ftpl({s: d.summary, summaries: summaries, trace_id: i})).show();;
  }
  var onMouseout = function(d, i){
    $('#summaryTable').hide();
  }

  g.on('click', onClick);

  circle.on('mouseover', onMouseover);
  circle.on('mouseout', onMouseout);

  return function(summaries){

    essMax = Math.max.apply(Math, summaries.map(function(x){return x.summary.essMin;}));

    var g = svg
      .selectAll("g")
      .data(summaries)
      .classed('trace-selected', function(d,i){ return i===0;});

    //enter
    var enter = g.enter()
      .append("g")
      .attr("transform", function(d, i) { return "translate(" + (i*60+40) + "," + (34) + ")"; });

    var circle = enter.append("circle")
      .attr("r", function(d){return 0 ;})
      .attr("class", function(d){return (d.summary.passed) ?  'passed': 'failed';});

    circle.transition()
      .duration(400)
      .attr("r", function(d){return d.summary.essMin/essMax*20 +5 ;});

    enter.append("text")
      .attr("dy", ".35em")
      .attr("text-anchor", "middle")
      .text(function(d, i){return i;});

    //update
    g.select("circle")
      .transition()
      .duration(400)
      .attr("r", function(d){return d.summary.essMin/essMax*20 +5;})
      .attr("class", function(d){return (d.summary.passed) ?  'passed': 'failed';});

    g.select("text")
      .text(function(d){return Math.round(d.summary.essMin);});

    //exit
    g.exit()
      .select("circle")
      .transition()
      .duration(400)
      .attr("r", function(d){return 0;});

    g.exit()
      .transition()
      .duration(400)
      .remove();

    circle.on('mouseover', onMouseover);
    circle.on('mouseout', onMouseout);
    enter.on('click', onClick);

  };


}
