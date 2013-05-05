function parMatrix(data, updateCorr1, updateCorr2, updateDensity1, updateDensity2,updateTrace,updateAutocorr) {

  //empty first parMatrix is called multiple times...
  $('#vis svg').remove();
  d3.select("#ActiveMatComp").classed('hidden', true);
  d3.select("#lock").classed('hidden', true);
  d3.select("#outlaid").classed('hidden', true);

  ////////////////////////
  // Variables definition
  ////////////////////////
  var dataset = []
    , rowdataset = []
    , likdata = [];

  var color = d3.scale.linear()
    .domain([-1,0,1])
    .range(["blue","white","red"]);

  var nbpars = data.length;
  var activMatClicked = false;
  var activeCell = [];
  var clickedCell = [];
  var posActCell = [];

  for (var i=0; i<nbpars-1; i++){
    rowdataset.push(data[i][i].par + ((data[i][i].group) ? ':' + data[i][i].group : '') );
    data[i][i].cc=1; // in order to have diagonal terms with maximal correlation
    for (var j=0; j<nbpars-1; j++){
      dataset.push([i, j, data[i][j]]);
    }
  };


  data[nbpars-1][nbpars-1].cc=1;
  likdata.push([nbpars-1,nbpars-1,data[nbpars-1][nbpars-1]]);
  

  var maxtextlength = Math.max.apply(Math, rowdataset.map(function(x){return x.length;}))
    , textfont = 10
    , matTotSize = 500 - maxtextlength * textfont
    , figsSize = matTotSize
    , matMarginSize = maxtextlength/2 * textfont // /2 is completely arbitrary TODO: understand fonts size
    , matSize = matTotSize - matMarginSize
    , cellSize = matSize/(nbpars-1)
    , growFact = 1.2
    , priorFirst = 0;
  
  ///////////////////////////////
  // main structures definition
  ///////////////////////////////
  var matTot = d3.select("#vis")
    .append("svg")
    .attr("width",matTotSize)
    .attr("height",matTotSize+2*matMarginSize)
  //.style("margin-left", - matMarginSize + "px")
    .append("g")
    .attr("transform", "translate(" + matMarginSize   + "," + matMarginSize + ")");

  var mat = matTot.append("svg")
    .attr("width",matSize)
    .attr("height",matSize)
    .attr("x",0)
    .attr("y",0);

  var matLik = matTot.append("svg")
    .attr("width",cellSize)
    .attr("height",cellSize)
    .attr("x",matSize/2-cellSize/2-2*textfont)
    .attr("y",(nbpars-1+0.25)*cellSize);

  d3.select("#lock").selectAll("img").remove();
  d3.select("#lock")
    .append("img")
    .attr('src','/images/locked.png')
    .attr("width",cellSize*Math.sqrt(growFact)/2+"px")
    .attr("height",cellSize*Math.sqrt(growFact)/2+"px")


  /////////////////////////////////
  // Static initialisation of svgs
  /////////////////////////////////
  mat.selectAll("rect")
    .data(dataset)
    .enter()
    .append("rect")
    .attr({
      x: function(d){ return d[0]*cellSize + "px"; },
      y: function(d){ return d[1]*cellSize + "px"; },
      width: cellSize + "px",
      height: cellSize + "px",
      fill: function(d) {
	return color(d[2].cc);
      }
    });

  
  matLik.selectAll("rect")
    .data(likdata)
    .enter()
    .append("rect")
    .attr({
      x: function(d){return 0 + "px"},
      y: function(d){return 0 + "px"},
      width: cellSize + "px",
      height: cellSize + "px",
      fill: function(d,i) {
	return color(d[2].cc);}
    });

  matTot.append("text")
    .attr('id','loglik')
    .attr("x",matSize/2+cellSize/2-textfont)
    .attr("y",(nbpars-1+0.75)*cellSize)
    .text("loglik");

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
  mat.selectAll("rect")
    .on("mouseover",function(d){
      posActCell = $(this).position();
      var indi = d[0];
      var indj = d[1];
      var cc = d[2].cc;
      var ess = d[2].ess;

      mouseov(indi,indj);
    })
    .on("mouseout",function(d){
      d3.event.stopPropagation();
  });

  matLik.selectAll("rect")
    .on("mouseover",function(d){
      posActCell = $(this).position();
      var indi = nbpars-1;
      var indj = nbpars-1;
      var cc = d[2].cc;
      var ess = d[2].ess;

      mouseov(indi,indj);
    })
    .on("mouseout",function(d){
      d3.event.stopPropagation();
  });

  d3.select('#outlaid')
    .on("mouseover",function(d){
      var indi = activeCell[0];
      var indj = Math.max(0,activeCell[1]-1);
      mouseov(indi,indj);
  });

  d3.select("#ActiveMatComp")
    .on("click",function(){
      if (activMatClicked){
          if (clickedCell[0] == activeCell[0] && clickedCell[1] == activeCell[1]){
            activMatClicked = false;
            d3.select("#lock")
              .classed('hidden', true)
          } else {
            clickedCell = activeCell;
            mouseov(clickedCell[0],clickedCell[1]);
            d3.select("#lock")
              .classed('hidden', false)
              .style("left", posActCell.left + cellSize/4 + "px")
              .style("top", posActCell.top + cellSize*3/16 + "px");
          }
      } else {
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
          if (clickedCell[0] == activeCell[0] && clickedCell[1] == activeCell[1]){
            activMatClicked = false;
            d3.select("#lock")
              .classed('hidden', true)
          }
      } else {
        activMatClicked = true;
        clickedCell = activeCell;
        d3.select("#lock")
        .classed('hidden', false)
        .style("left", posActCell.left + cellSize/4 + "px")
        .style("top", posActCell.top + cellSize*3/16 + "px");
      };
    });

  d3.select("#density1")
    .on("click",function(d){
      if (priorFirst){
	priorFirst = 0;
      } else {
	priorFirst = 1;
      };
      updateDensity1(data, activeCell[0], priorFirst);
      updateDensity2(data, activeCell[1], priorFirst);
    });

  d3.select("#density2")
    .on("click",function(d){
      if (priorFirst){
	priorFirst = 0;
      } else {
	priorFirst = 1;
      };
      updateDensity1(data, activeCell[0], priorFirst);
      updateDensity2(data, activeCell[1], priorFirst);
    });

  function mouseov(indi,indj){


    if (indi<nbpars-1){
      cell = $(mat.selectAll("rect")[0][indi*(nbpars-1)+indj]);
    } else {
      cell = $(matLik.selectAll("rect")[0]);
    }

    d = data[indi][indj];


    posActCell = cell.position();
    var cc = d.cc;
    var ess = d.ess;

    
    activeCell = [indi,indj];

    d3.select("#ActiveMatComp")
      .classed('hidden', false)
      .style("background-color",function(d) {
        return color(cc);})
      .style("width", cellSize*Math.sqrt(growFact) + "px")
      .style("height", cellSize*Math.sqrt(growFact) + "px")
      .style("left", posActCell.left -cellSize*(Math.sqrt(growFact)-1)/2 + "px")
      .style("top", posActCell.top - cellSize*(Math.sqrt(growFact)-1)/2 + "px");


    d3.select("#outlaid")
      .classed('hidden', false)
      .style("left", posActCell.left +cellSize/2 + "px")
      .style("top", posActCell.top + "px");

    if (indi == indj){
      $('#outlaid a[rel=tooltip]').attr('data-original-title','ESS: ' + Math.round(ess*100)/100).tooltip('fixTitle');
    } else {
      $('#outlaid a[rel=tooltip]').attr('data-original-title','Corr: ' + Math.round(cc*100)/100).tooltip('fixTitle');
    }

    $('#outlaid a[rel=tooltip]').tooltip("show");


    if(!activMatClicked){
      d3.selectAll(".row text").classed("activetext", function(d,i){
	return i == indj+1;
      })
      d3.selectAll(".column text").classed("activetext", function(d,i){
	return i == indi;
      })
      d3.select("#loglik").classed("activetext", function(d,i){
	return indi == nbpars-1;
      })

      if(indi === indj){

	$('#corr1, #corr2, #density1').addClass('hidden');
	$('#trace, #autocorr, #test').removeClass('hidden');

//	$('#trace img').attr('src', '/trace/' + data[indi][indi].png.trace_id).height('220px').width('220px');
//	$('.autocor img').attr('src', '/trace/' + data[indi][indi].png.autocor_id).height('220px').width('220px');


	$('#geweke').html(data[indi][indi].geweke);
	$('#heidel-start').html(data[indi][indi].heidel.start);
	$('#heidel-pvalue').html(Math.round(data[indi][indi].heidel.pvalue*10000)/10000);

	$('#raftery-M').html(data[indi][indi].raftery.M || 'failed');
	$('#raftery-N').html(data[indi][indi].raftery.N || 'failed');
	$('#raftery-Nmin').html(data[indi][indi].raftery.Nmin || 'failed');
	$('#raftery-I').html(data[indi][indi].raftery.I || 'failed');

	$('#ess').html(Math.round(data[indi][indi].ess*100)/100)

      } else {
	$('#corr1, #corr2, #density1').removeClass('hidden');
	$('#trace, #autocorr, #test').addClass('hidden');
	
      }


      updateCorr1(data, indi, indj);
      updateCorr2(data, indj, indi);

      updateDensity1(data, indi, priorFirst);
      updateDensity2(data, indj, priorFirst);

      updateTrace(data,indi);
      updateAutocorr(data,indi);
    }};



  //return update function (assume that only colors change)

  return function(data){

    var dataset = [];

    for (var i=0; i<data.length-1; i++){
      data[i][i].cc=1;
      for (var j=0; j<data.length-1; j++){
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
    updateTrace(data,0);
    updateAutocorr(data,0);

  };

};
