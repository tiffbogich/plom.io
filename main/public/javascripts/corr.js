function plotCorr(diag, i, j){

  var xlabel = diag[0][i][i].par + ':' + diag[0][i][i].group;
  var ylabel = diag[0][j][j].par + ':' + diag[0][j][j].group;

  var data = [];
  diag[0][i][i].trace.forEach(function(x, k){
    data.push({
      x: x, 
      y: diag[0][j][j].trace[k],
      like: diag[0][diag[0].length-1][diag[0].length-1].trace[k]
    });
  });

  var margin = {top: 20, right: 20, bottom: 30, left: 40},
  width = 200 - margin.left - margin.right,
  height = 200 - margin.top - margin.bottom;


  var x = d3.scale.linear()
    .range([0, width])
    .domain(d3.extent(data, function(d) { return d.x; })).nice();


  var y = d3.scale.linear()
    .range([height, 0])
    .domain(d3.extent(data, function(d) { return d.y; })).nice();


  var color = d3.scale.linear()
    .domain(d3.extent(data, function(d) { return d.like; }))
    .range(["white", "red"]);

  var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .ticks(3);

  var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .ticks(3);

  var svg = d3.select("#corr1").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svg.append("g")
    .attr("id", "x-axis")
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
    .attr("id", "y-axis")
    .attr("class", "y axis")
    .call(yAxis)
    .append("text")
    .attr("class", "label")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text(ylabel)

  svg.selectAll(".dot")
    .data(data)
    .enter().append("circle")
    .attr("class", "dot")
    .attr("r", 1)
    .attr("cx", function(d) { return x(d.x); })
    .attr("cy", function(d) { return y(d.y); })
    .style("fill", function(d) { return color(d.like); })
    .style("stroke", function(d) { return color(d.like); });

  return function(i, j) {

    var data = [];
    var xlabel = diag[0][i][i].par + ':' + diag[0][i][i].group;
    var ylabel = diag[0][j][j].par + ':' + diag[0][j][j].group;

    diag[0][i][i].trace.forEach(function(x, k){
      data.push({
        x: x, 
        y: diag[0][j][j].trace[k],
        like: diag[0][diag[0].length-1][diag[0].length-1].trace[k]
      });
    });

    x.domain(d3.extent(data, function(d) { return d.x; })).nice();
    y.domain(d3.extent(data, function(d) { return d.y; })).nice();
    color.domain(d3.extent(data, function(d) { return d.like; })).nice();
    xAxis.scale(x);
    yAxis.scale(y);

    svg.selectAll(".dot")
      .data(data)
      .transition()
      .duration(100)
      .attr("cx", function(d) { return x(d.x); })
      .attr("cy", function(d) { return y(d.y); })      

    d3.select("#x-axis")
      .call(xAxis)
      .select('.label')
      .text(xlabel);
  
    d3.select("#y-axis")
      .call(yAxis)
      .select('.label')
      .text(ylabel);
    
  };

}
