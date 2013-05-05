function plotDensity(diag, i, ind, width, height, priorFirst){
  
  width = width || 220;
  height = height || 220;

  var data = [];
  diag[i][i].posterior.x.forEach(function(x, k){
    data.push({
      xpost: diag[i][i].posterior.x[k], 
      ypost: diag[i][i].posterior.y[k],
      xpriorRestr: diag[i][i].priorRestr.x[k], 
      ypriorRestr: diag[i][i].priorRestr.y[k],
      xprior: diag[i][i].prior.x[k], 
      yprior: diag[i][i].prior.y[k]
    });
  });

  var xlabel = diag[i][i].par + ':' + diag[i][i].group;

  var margin = {top: 25, right: 30, bottom: 35, left: 40};  
  width = width - margin.left - margin.right;
  height = height - margin.top - margin.bottom;

  var x = d3.scale.linear()
    .range([0, width])
    .domain(d3.extent(data, function(d) { return d.xpost; })).nice();
  var y = d3.scale.linear()
    .range([height, 0])
    .domain(d3.extent(data, function(d) { return d.ypost; })).nice();
  
 

  var color_hash = {
    0 : ["prior", d3.rgb(234,234,234)],
    1 : ["post.", d3.rgb(200,200,200)] 
  }

  var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .ticks(3);

  var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .ticks(3);

  var linepost = d3.svg.line()
    .x(function(d) { return x(d.xpost); })
    .y(function(d) { return y(d.ypost); });

  var linepriorRestr = d3.svg.line()
      .x(function(d) { return x(d.xpriorRestr); })
      .y(function(d) { return y(d.ypriorRestr); });

  var lineprior = d3.svg.line()
      .x(function(d) { return x(d.xprior); })
      .y(function(d) { return y(d.yprior); });

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
    .attr("x", 90)
    .attr("y", +32)
    .style("text-anchor", "middle")
    .text(xlabel);

  svg.append("g")
    .attr("id", "y-axis-density" + ind)
    .attr("class", "y axis")
    .call(yAxis);
  
  svg.append("path")
    .datum(data)
    .attr("class", "density_prior")
    .attr("d", linepriorRestr);

  svg.append("path")
    .datum(data)
    .attr("class", "density_post")
    .attr("d", linepost);

  var legend = svg.append("g")
    .attr('class','legend')
    .attr('x',220-65)
    .attr('y',25)
    .attr("height",100)
    .attr("width",100);

  var tmp = [{x:1},{x:2}];

  legend.selectAll("rect")
    .data(tmp)
    .enter()
    .append("rect")
    .attr('x',220-85)
    .attr('y',function(d,i){return i*20;})
    .attr("height",10)
    .attr("width",10)
    .style("fill",function(d) {
      var color = color_hash[tmp.indexOf(d)][1];
      return color;
    });

  legend.selectAll("text")
    .data(tmp)
    .enter()
    .append("text")
    .attr('x',220-72)
    .attr('y',function(d,i){return i*20+9;})
    .attr("height",10)
    .attr("width",10)
    .text(function(d) {
      var color = color_hash[tmp.indexOf(d)][0];
      return color;
    });
   
  return function(diag, i, priorFirst){

    var data = [];
    var xlabel = diag[i][i].par + ':' + diag[i][i].group;

    diag[i][i].posterior.x.forEach(function(x, k){
      data.push({
	xpost: diag[i][i].posterior.x[k], 
	ypost: diag[i][i].posterior.y[k],
	xpriorRestr: diag[i][i].priorRestr.x[k], 
	ypriorRestr: diag[i][i].priorRestr.y[k],
	xprior: diag[i][i].prior.x[k], 
	yprior: diag[i][i].prior.y[k]
      });
    });

    if (priorFirst){
      x.domain(d3.extent(data, function(d) { return d.xprior; })).nice();
    } else {
      x.domain(d3.extent(data, function(d) { return d.xpost; })).nice();
    };
    y.domain(d3.extent(data, function(d) { return d.ypost; })).nice();

    xAxis.scale(x);
    yAxis.scale(y);

    if (priorFirst){
      svg.select(".density_post")
	.datum(data)
	.transition()
	.duration(200)
	.attr("d", linepost)
      svg.select(".density_prior")
	.datum(data)
	.transition()
	.duration(200)
	.attr("d", lineprior)
    } else {
      svg.select(".density_prior")
	.datum(data)
	.transition()
	.duration(200)
	.attr("d", linepriorRestr)
      svg.select(".density_post")
	.datum(data)
	.transition()
	.duration(200)
	.attr("d", linepost)
    };

    d3.select("#x-axis-density" + ind)
      .call(xAxis)
      .select('.label')
      .text(xlabel);
    
    d3.select("#y-axis-density" + ind)
      .call(yAxis)
      .selectAll('text')
      .attr("transform", function(d){
	return "rotate(-90) translate(10,-15)"
      })
      .style("text-anchor", "middle");

  };


};
