function plotTrace(diag, i, ind){

  tmpvect = [];
  for (var k=0;k<diag[i][i].trace.length; k++) tmpvect.push(k/diag[i][i].trace.length*diag[i][i].nbiters);

  console.log(diag[i][i].trace);

  var data = [];
  diag[i][i].trace.forEach(function(x, k){
    data.push({
      x: tmpvect[k], 
      y: x
    });
  });

  var xlabel = diag[i][i].par + ':' + diag[i][i].group;

  var margin = {top: 25, right: 30, bottom: 35, left: 40}
    , width = 220 - margin.left - margin.right
    , height = 220 - margin.top - margin.bottom;

  var x = d3.scale.linear()
    .range([0, width])
    .domain(d3.extent(data, function(d) { return d.x; })).nice();

  var y = d3.scale.linear()
    .range([height, 0])
    .domain(d3.extent(data, function(d) { return d.y; })).nice();
 
  var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .ticks(3);

  var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .ticks(3);

  var line = d3.svg.line()
    .x(function(d) { return x(d.x); })
    .y(function(d) { return y(d.y); });

  var svg = d3.select("#trace").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svg.append("g")
    .attr("id", "x-axis-trace" + ind)
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)
    .append("text")
    .attr("class", "label")
    .attr("x", 90)
    .attr("y", +32)
    .style("text-anchor", "middle")
    .text('Iterations');



  svg.append("g")
    .attr("id", "y-axis-trace" + ind)
    .attr("class", "y axis")
    .call(yAxis);

 

  svg.append("path")
    .datum(data)
    .attr("id","trace-line")
    .attr("class", "line")
    .attr("d", line);

  var legend = svg.append("g")
    .attr('class','legend')
    .attr('x',220-65)
    .attr('y',25)
    .attr("height",100)
    .attr("width",100);

  var tmp = [{x:1},{x:2}];
  
 

  return function(diag, i){

   
    var data = [];
    var xlabel = diag[i][i].par + ':' + diag[i][i].group;

    diag[i][i].trace.forEach(function(x, k){
      data.push({
        x: tmpvect[k], 
        y: x
      });
    });

    x.domain(d3.extent(data, function(d) { return d.x; })).nice();
    y.domain(d3.extent(data, function(d) { return d.y; })).nice();
    xAxis.scale(x);
    yAxis.scale(y);



    svg.select("#trace-line")
      .datum(data)
      .transition()
      .duration(200)
      .attr("d", line)

    d3.select("#x-axis-trace" + ind)
      .call(xAxis)
      .select('.label')
      .text('Iterations');

    d3.select("#y-axis-trace" + ind)
      .call(yAxis)
      .select('.label')
      .text(xlabel);  
    
    d3.select("#y-axis-trace" + ind)
      .call(yAxis)
      .selectAll('text')
      .attr("transform", function(d){
	return "rotate(-90) translate(10,-15)"
      })
      .style("text-anchor", "middle");

  };

};
