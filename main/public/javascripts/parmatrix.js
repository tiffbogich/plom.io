function parMatrix(data, updateCorr1, updateCorr2, updateDensity1, updateDensity2) {

  //empty first parMatrix is called multiple times...
  $('#vis svg').remove();
  d3.select("#ActiveMatComp").classed('hidden', true);
  d3.select("#lock").classed('hidden', true);
  d3.select("#ourtooltip").classed('hidden', true);

  ////////////////////////
  // Variables definition
  ////////////////////////
  var dataset = []
    , rowdataset = [];

  var color = d3.scale.linear()
    .domain([-1,0,1])
    .range(["blue","white","red"]);

  var nbpars = data.length;
  var activMatClicked = false;
  var activeCell = [];
  var clickedCell = [];
  var posActCell = [];

  for (var i=0; i<nbpars; i++){
    rowdataset.push(data[i][i].par + ((data[i][i].group) ? ':' + data[i][i].group : '') );
    data[i][i].cc=1; // in order to have diagonal terms with maximal correlation
    for (var j=0; j<nbpars; j++){
      dataset.push([i, j, data[i][j]]);
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


  d3.select("#lock").selectAll("img").remove();
  d3.select("#lock")
    .append("img")
    .attr('src','/images/locked.png')
    .attr("width",cellSize*Math.sqrt(growFact)/2+"px")
    .attr("height",cellSize*Math.sqrt(growFact)/2+"px")


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
      posActCell = $(this).position();
      var indi = d[0];
      var indj = d[1];
      var cc = d[2].cc;
      var ess = d[2].ess;
      
      activeCell = [d[0],d[1]];

      d3.select("#ActiveMatComp")
	.classed('hidden', false)
	.style("background-color",function(d) {
	  return color(cc);})
	.style("width", cellSize*Math.sqrt(growFact) + "px")
	.style("height", cellSize*Math.sqrt(growFact) + "px")
	.style("left", posActCell.left -cellSize*(Math.sqrt(growFact)-1)/2 + "px")
	.style("top", posActCell.top - cellSize*(Math.sqrt(growFact)-1)/2 + "px");

      

     // d3.select(actCell)
//	.style("background-color",function(d) {
//	  return color(cc);})
//	.style("width", cellSize*Math.sqrt(growFact) + "px")
//	.style("height", cellSize*Math.sqrt(growFact) + "px")

      d3.select("#ourtooltip")
	.classed('hidden', false)
	.style("left", posActCell.left +cellSize/2 + "px")
	.style("top", posActCell.top + "px");
      
      if (indi == indj){
	$('#ourtooltip a[rel=tooltip]').attr('data-original-title','ESS: ' + Math.round(ess*100)/100).tooltip('fixTitle');
      } else {
	$('#ourtooltip a[rel=tooltip]').attr('data-original-title','Corr: ' + Math.round(cc*100)/100).tooltip('fixTitle');
      }

      $('#ourtooltip a[rel=tooltip]').tooltip("show");
      
      console.log(activMatClicked);
      if(!activMatClicked){
	mouseov(indi,indj);
      }

    })
    .on("mouseout",function(d){
      d3.event.stopPropagation();
    });

  d3.select("#ActiveMatComp")
    .on("click",function(){
      if (activMatClicked){
	  console.log(clickedCell);
	  console.log(activeCell);
	  console.log(clickedCell[0] == activeCell[0] && clickedCell[1] == activeCell[1])
	  if (clickedCell[0] == activeCell[0] && clickedCell[1] == activeCell[1]){
            activMatClicked = false;
     	    d3.select("#lock")
	      .classed('hidden', true)
	  }
      } else {
	console.log(posActCell);
	activMatClicked = true;
	clickedCell = activeCell;
	d3.select("#lock")
	.classed('hidden', false)
	.style("left", posActCell.left + cellSize/4 + "px")
	.style("top", posActCell.top + cellSize*3/16 + "px");
      };
    });

  d3.select("#lock")
    .on("click",function(){
      if (activMatClicked){
	  console.log(clickedCell);
	  console.log(activeCell);
	  console.log(clickedCell[0] == activeCell[0] && clickedCell[1] == activeCell[1])
	  if (clickedCell[0] == activeCell[0] && clickedCell[1] == activeCell[1]){
            activMatClicked = false;
     	    d3.select("#lock")
	      .classed('hidden', true)
	  }
      } else {
	console.log(posActCell);
	activMatClicked = true;
	clickedCell = activeCell;
	d3.select("#lock")
	.classed('hidden', false)
	.style("left", posActCell.left + cellSize/4 + "px")
	.style("top", posActCell.top + cellSize*3/16 + "px");
      };
    });

  function mouseov(indi,indj){
    console.log('youhou');
    d3.selectAll(".row text").classed("activetext", function(d,i){
      return i == indj;
    })
    d3.selectAll(".column text").classed("activetext", function(d,i){
      return i == indi;
    })


    if(indi === indj){

      $('#corr1, #corr2, #density1').addClass('hidden');
      $('#trace, #autocor, #test').removeClass('hidden');

      $('#trace img').attr('src', '/trace/' + data[indi][indi].png.trace_id);
      $('#autocor img').attr('src', '/trace/' + data[indi][indi].png.autocor_id);

      $('#geweke').html(data[indi][indi].geweke);
      $('#heidel-start').html(data[indi][indi].heidel.start);
      $('#heidel-pvalue').html(data[indi][indi].heidel.pvalue);

      $('#raftery-M').html(data[indi][indi].raftery.M || 'failed');
      $('#raftery-N').html(data[indi][indi].raftery.N);
      $('#raftery-Nmin').html(data[indi][indi].raftery.Nmin || 'failed');
      $('#raftery-I').html(data[indi][indi].raftery.I || 'failed');

      $('#ess').html(data[indi][indi].ess);

    } else {

      $('#corr1, #corr2, #density1').removeClass('hidden');
      $('#trace, #autocor, #test').addClass('hidden');

    }

    updateCorr1(data, indi, indj);          
    updateCorr2(data, indj, indi);

    updateDensity1(data, indi);
    updateDensity2(data, indj);

  };

  mat.on("mouseout",function(d){
    d3.select("#ActiveMatComp").classed('hidden', true);
  });

  //return update function (assume that only colors change)

  return function(data){
    var dataset = [];

    for (var i=0; i<data.length; i++){
      data[i][i].cc=1;
      for (var j=0; j<data.length; j++){
        dataset.push([i, j, data[i][j]]);
      }
    }

    matTot.selectAll("rect")
      .data(dataset)
      .transition()
      .duration(500)
      .attr('fill', function(d) {return color(d[2].cc);});  

    d3.select("#ActiveMatComp").classed('hidden', true);

    updateCorr1(data, 0, 1);          
    updateCorr2(data, 1, 0);
    updateDensity1(data, 0);
    updateDensity2(data, 1);

  };

};
