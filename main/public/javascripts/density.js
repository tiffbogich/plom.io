function plotDensity(diag, i, ind){

  var data = [];
  diag[0][i][i].posterior.x.forEach(function(x, k){
    data.push({
      x: x, 
      y: diag[0][i][i].posterior.y[k],
    });
  });

  var xlabel = diag[0][i][i].par + ':' + diag[0][i][i].group;

  var margin = {top: 20, right: 20, bottom: 30, left: 40}
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

  var svg = d3.select("#density" + ind).append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svg.append("g")
    .attr("id", "x-axis-density" + ind)
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)
    .append("text")
    .attr("class", "label")
    .attr("x", width)
    .attr("y", -6)
    .style("text-anchor", "end")
    .text(xlabel);

  svg.append("g")
    .attr("id", "y-axis-density" + ind)
    .attr("class", "y axis")
    .call(yAxis);

  svg.append("path")
    .datum(data)
    .attr("class", "density")
    .attr("d", line);


  return function(i){

    var data = [];
    var xlabel = diag[0][i][i].par + ':' + diag[0][i][i].group;

    diag[0][i][i].posterior.x.forEach(function(x, k){
      data.push({
        x: x, 
        y: diag[0][i][i].posterior.y[k],
      });
    });

    x.domain(d3.extent(data, function(d) { return d.x; })).nice();
    y.domain(d3.extent(data, function(d) { return d.y; })).nice();
    xAxis.scale(x);
    yAxis.scale(y);

    svg.select(".density")
      .datum(data)
      .transition()
      .duration(200)
      .attr("d", line);

    d3.select("#x-axis-density" + ind)
      .call(xAxis)
      .select('.label')
      .text(xlabel);
    
    d3.select("#y-axis-density" + ind)
      .call(yAxis);

  };


};
