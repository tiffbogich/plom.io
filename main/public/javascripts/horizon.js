function plomHorizon(data){

  var margin = {top: 0, right: 20, bottom: 0, left: 20}
    , width = 450 - margin.right - margin.left
    , height = 30 - margin.top - margin.bottom;

  var medians = [];
  data.forEach(function(d, i){
    var median = d3.median(d, function(x) {return x[1];});
    medians.push(median);
  });

  //togle mirror button:
  $("#changeMode button:first").addClass('active');

  var chart = d3.horizon()
    .width(width)
    .height(height)
    .bands(1)
    .mode("mirror")
    .interpolate("step_before"); //"linear", // or basis, monotone, step-before, etc.

  var g = d3.select("#horizonGraph")
    .selectAll("svg")
    .data(data)
    .enter()
    .append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

//  g.on('mouseover', function(d, i){
//    //TODO highlight corresponding text
//  })

  // Render the chart.
  g.data(data).call(chart);

  //x-axis
  var time_extent = d3.extent( data[0], function(d, i){return d[0]} );
  var time_scale = d3.time.scale()
    .domain(time_extent)
    .range([1, width]);

  var time_axis = d3.svg.axis().scale(time_scale);

  var xaxis = d3.select("#horizonGraph").append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", 20)
    .append("g")
    .attr("class", "axis")
    .attr("transform", "translate(" + margin.left + "," + 0 + ")");

  xaxis.call(time_axis);

  //interactions

  //bands buttons
  d3.selectAll("#addBand button").data([1, -1]).on("click", function(d) {
    var n = Math.max(1, chart.bands() + d);
    g.call(chart.duration(500).bands(n));
  });

  //substract median
  d3.select("#substactMedian").on("click", function() {
    //add or substract median depending on button state
    var mul = $(this).hasClass('active') ? -1 : 1;

    g.each(function(mydata, i){
      mydata.forEach(function(d, k){
        if(d[1]){
          mydata[k][1] = d[1] - medians[i] * mul;
        }
      });
      d3.select(this).data([mydata]).call(chart.duration(500));
    });
  });

  //mode buttons
  d3.selectAll("#changeMode button")
    .data(['mirror', 'offset'])
    .on("click", function(d) {
      g.call(chart.duration(0).mode(d));
    });
};
