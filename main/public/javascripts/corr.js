function plotCorr(diag, i, j, ind){

  var xlabel = diag[i][i].par + ':' + diag[i][i].group;
  var ylabel = diag[j][j].par + ':' + diag[j][j].group;

  var data = [];
  diag[i][i].trace.forEach(function(x, k){
    data.push({
      x: x, 
      y: diag[j][j].trace[k],
      like: diag[diag.length-1][diag.length-1].trace[k]
    });
  });

  var margin = {top: 25, right: 25, bottom: 35, left: 40}
    , width = 220 - margin.left - margin.right
    , height = 220 - margin.top - margin.bottom;

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

  var svg = d3.select("#corr" + ind).append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");  

  svg.append("g")
    .attr("id", "x-axis" + ind)
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)
    .append("text")
    .attr("class", "label")
    .attr("x", 90)
    .attr("y", 32)
    .style("text-anchor", "middle")
    .text(xlabel);

  svg.append("g")
    .attr("id", "y-axis" + ind)
    .attr("class", "y axis")
    .call(yAxis)
    .append("text")
    .attr("class", "label")
 //   .attr("transform", "rotate(-90)")
    .attr("y", -20)
    .attr("x", -100)
    .attr("dy", ".71em")
    .style("text-anchor", "middle")
    .text(ylabel);


  
  svg.selectAll(".dot")
    .data(data)
    .enter().append("circle")
    .attr("class", "dot")
    .attr("r", 1)
    .attr("cx", function(d) { return x(d.x); })
    .attr("cy", function(d) { return y(d.y); })
    .style("fill", function(d) { return color(d.like); })
    .style("stroke", function(d) { return color(d.like); });


  return function(diag, i, j) {

    var data = [];
    var xlabel = diag[i][i].par + ':' + diag[i][i].group;
    var ylabel = diag[j][j].par + ':' + diag[j][j].group;

    diag[i][i].trace.forEach(function(x, k){
      data.push({
        x: x, 
        y: diag[j][j].trace[k],
        like: diag[diag.length-1][diag.length-1].trace[k]
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
      .duration(200)
      .attr("cx", function(d) { return x(d.x); })
      .attr("cy", function(d) { return y(d.y); })      

    d3.select("#x-axis" + ind)
      .call(xAxis)
      .select('.label')
      .text(xlabel);
  
    d3.select("#y-axis" + ind)
      .call(yAxis)
      .select('.label')
      .text(ylabel);    

    d3.select("#y-axis" + ind)
      .call(yAxis)
      .selectAll('text')
      .attr("transform", function(d){
	return "rotate(-90) translate(10,-15)"
      })
      .style("text-anchor", "middle");
      //.attr("transform", "translate(-20,0)");
    
 
  };}
	  
