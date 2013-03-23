


$(document).ready(function() {
		
    var dataset = [];
    var color = d3.scale.linear()
	.domain([-1,0,1])
	.range(["blue","white","red"]);

    var nbpars = 10;
    for (var i=0; i<nbpars; i++){
	for (var j=0; j<nbpars; j++){
	    dataset.push([i,j,"yuuuu"]);
	} 
    }

    

    var MatTotSize = 400;
    var MatMarginSize = 50;
    var MatSize = MatTotSize - MatMarginSize;
    var CellSize = MatSize/Math.sqrt(dataset.length);

    var maxtextlenght = Math.max.apply(Math,dataset.map(function(d){return d[2].length}));
    var textfont = Math.min(CellSize/2,Math.min(11,Math.round(MatMarginSize/maxtextlenght)));
    console.log(textfont);


    var barPadding = 0;
    var GrowFact = 2;
    var MatTot = d3.select("#vis")
	.append("svg")
	.attr("width",MatTotSize)
	.attr("height",MatTotSize)
	//.style("margin-left", - MatMarginSize + "px")
	.append("g")
	.attr("transform", "translate(" + MatMarginSize   + "," + MatMarginSize + ")");

    var Mat = MatTot.append("svg")
	.attr("width",MatSize)
	.attr("height",MatSize)
	.attr("x",0)
	.attr("y",0);
  
    MatTot.selectAll("rect")
	.data(dataset)
	.enter()
	.append("rect")
	.attr({
	    x: function(d){ return d[0]*CellSize + "px"; },
	    y: function(d){ return d[1]*CellSize + "px"; }, 
	    width: CellSize + "px",
	    height: CellSize + "px",
	    fill: function(d,i) {return color(2*(Math.random()-0.5));}
	});


    var row = MatTot.selectAll(".row")
	.data(dataset)
	.enter().append("g")
	.attr("class", "row")
//	.attr("x",MatMarginSize)
//	.attr("y",function(d,i){ return MatMarginSize + d[1]*CellSize})

    row.append("text")
	.attr("x",  - CellSize + "px")
	.attr("y", function(d,i){ return (d[1]+0.75)*CellSize + "px" })
//	.attr("dy", ".32em")
	.attr("text-anchor", "end")
	.style("font-size",function(){return textfont + "px"})
	.text(function(d, i) { return "yi"; });
  	
    var column = MatTot.selectAll(".column")
	.data(dataset)
	.enter().append("g")
	.attr("class", "column")
	.attr("tranform", function(d,i) {return "translate(" + d[i]*CellSize + "px)rotate(-90)";});
//	.attr("x",MatMarginSize)
//	.attr("y",function(d,i){ return MatMarginSize + d[1]*CellSize})

    column.append("text")
	.attr("x", CellSize + "px")
	.attr("y", function(d,i){ return (d[1]+0.75)*CellSize + "px" })
//	.attr("dy", ".32em")
	.attr("text-anchor", "start")
	.style("font-size",function(){return textfont + "px"})
	.text(function(d, i) { return "yo"; })
	.attr("transform", function(d,i) {return  "rotate(-90)";});
    

    MatTot.selectAll("rect")
    	.on("mouseover",function(d){
	    var pos = $(this).position();
	    var indi = d[0];
	    var indj = d[1];
	    d3.select("#ActiveMatComp")
	        .classed('hidden', false)
		.style("background-color","blue")
		.style("width", CellSize*GrowFact + "px")
		.style("height", CellSize*GrowFact + "px")
	    	.style("position", "absolute")
		.style("left", pos.left -CellSize*(GrowFact-1)/2 + "px")
	    	.style("top", pos.top - CellSize*(GrowFact-1)/2 + "px")
		.style("z-index", 1);
	   // d3.selectAll(".row text").classed("activetext",function(d,i){
	//	console.log(i)
	//	return indi == d[0];
	  //  });
	    mouseov(indi,indj);
	})
//	.on("mouseover",function(d){
//	    d3.selectAll(".row text").classed("activetext",function(d,i){
//		return i == d[1];
//	    });
//	})
	.on("mouseout",function(d){
	    d3.event.stopPropagation();
	})

    function mouseov(indi,indj){
	d3.selectAll(".row text").classed("activetext", function(d,i){
	    return d[1] == indj;
	})
	d3.selectAll(".column text").classed("activetext", function(d,i){
	    return d[1] == indi;
	})
    };
   
    Mat.on("mouseout",function(d){
	    d3.select("#ActiveMatComp").classed('hidden', true);
    });
    
});			  
			
