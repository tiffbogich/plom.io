function parMatrix(data, updateCorr1, updateCorr2, updateDensity1, updateDensity2) {

  ////////////////////////
  // Variables definition
  ////////////////////////
  var dataset = []
    , rowdataset = [];

  var color = d3.scale.linear()
    .domain([-1,0,1])
    .range(["blue","white","red"]);

  var nbpars = data[0].length;

  for (var i=0; i<nbpars; i++){
    rowdataset.push(data[0][i][i].par + ((data[0][i][i].group) ? ':' + data[0][i][i].group : '') );

    data[0][i][i].cc=1; // in order to have diagonal terms with maximal correlation

    for (var j=0; j<nbpars; j++){
      dataset.push([i, j, data[0][i][j]]);
    } 
  }

  var maxtextlength = Math.max.apply(Math, rowdataset.map(function(x){return x.length;}))
    , textfont = 10
    , matTotSize = 550 - maxtextlength * textfont
    , figsSize = matTotSize
    , matMarginSize = maxtextlength/2 * textfont // /2 is completely arbitrary TODO: understand fonts size
    , matSize = matTotSize - matMarginSize
    , cellSize = matSize/nbpars
    , growFact = 1.2;

  ///////////////////////////////
  // main structures definition
  ///////////////////////////////
  var matTot = d3.select("#vis")
    .append("svg")
    .attr("width",matTotSize)
    .attr("height",matTotSize)
  //.style("margin-left", - matMarginSize + "px")
    .append("g")
    .attr("transform", "translate(" + matMarginSize   + "," + matMarginSize + ")");

  var mat = matTot.append("svg")
    .attr("width",matSize)
    .attr("height",matSize)
    .attr("x",0)
    .attr("y",0);

  /////////////////////////////////
  // Static initialisation of svgs
  /////////////////////////////////
  matTot.selectAll("rect")
    .data(dataset)
    .enter()
    .append("rect")
    .attr({
      x: function(d){ return d[0]*cellSize + "px"; },
      y: function(d){ return d[1]*cellSize + "px"; }, 
      width: cellSize + "px",
      height: cellSize + "px",
      fill: function(d) {return color(d[2].cc);}
    });

  var row = matTot.selectAll(".row")
    .data(rowdataset)
    .enter().append("g")
    .attr("class", "row");

  row.append("text")
    .attr("x",  "-5px")
    .attr("y", function(d,i){return (i+0.5)*cellSize + textfont/2 + "px";})
    .attr("text-anchor", "end")
    .style("font-size",function(){return textfont + "px";})
    .text(function(d) { return d; });

  var column = matTot.selectAll(".column")
    .data(rowdataset)
    .enter().append("g")
    .attr("class", "column")
    .attr("tranform", function(d,i) {return "translate(" + i*cellSize + "px)rotate(-90)";});

  column.append("text")
    .attr("x", "5px")
    .attr("y", function(d,i){ return (i+0.5)*cellSize + textfont/2 + "px" })
    .attr("text-anchor", "start")
    .style("font-size",function(){return textfont + "px"})
    .text(function(d) { return d; })
    .attr("transform", function(d,i) {return  "rotate(-90)";});
  
    
  //////////////////////////////////////
  // Listeners / interactive components
  //////////////////////////////////////
  matTot.selectAll("rect")
    .on("mouseover",function(d){
      var pos = $(this).position();
      var indi = d[0];
      var indj = d[1];
      var cc = d[2].cc;
      var ess = d[2].ess;

      d3.select("#ActiveMatComp")
	.classed('hidden', false)
	.style("background-color",function(d) {
	  return color(cc);})
	.style("width", cellSize*Math.sqrt(growFact) + "px")
	.style("height", cellSize*Math.sqrt(growFact) + "px")
	.style("position", "absolute")
	.style("left", pos.left -cellSize*(Math.sqrt(growFact)-1)/2 + "px")
	.style("top", pos.top - cellSize*(Math.sqrt(growFact)-1)/2 + "px")
	.style("z-index", 1);

      if (indi == indj){
	$('a[rel=tooltip]').attr('data-original-title','ess: ' + ess).tooltip('fixTitle');
      } else {
	$('a[rel=tooltip]').attr('data-original-title','cc: ' + cc).tooltip('fixTitle');
      }

      $('a[rel=tooltip]').tooltip("show");
      
      mouseov(indi,indj);

    })
    .on("mouseout",function(d){
      d3.event.stopPropagation();
    });



  function mouseov(indi,indj){
    d3.selectAll(".row text").classed("activetext", function(d,i){
      return i == indj;
    })
    d3.selectAll(".column text").classed("activetext", function(d,i){
      return i == indi;
    })


    if(indi === indj){
      $('#corr1, #corr2, #density1').addClass('hidden');
      $('#trace, #autocor, #test').removeClass('hidden');

      $('#trace img').attr('src', '/trace/' + data[0][indi][indi].png.trace_id);
      $('#autocor img').attr('src', '/trace/' + data[0][indi][indi].png.autocor_id);

      $('#geweke').html(data[0][indi][indi].geweke);
      $('#heidel').html('start: ' + data[0][indi][indi].heidel.start + ' ; pvalue: ' +data[0][indi][indi].heidel.pvalue);
      $('#ess').html(data[0][indi][indi].ess);

    } else {
      $('#corr1, #corr2, #density1').removeClass('hidden');
      $('#trace, #autocor, #test').addClass('hidden');
    }


    updateCorr1(indi, indj);          
    updateCorr2(indj, indi);

    updateDensity1(indi);
    updateDensity2(indj);

  };


  mat.on("mouseout",function(d){
    d3.select("#ActiveMatComp").classed('hidden', true);
  });


  $('a[rel=popover]').popover();
  $('a[rel=tooltip]').tooltip();

};
