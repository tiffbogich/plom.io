
// = require bootstrap

//$(document).ready(function() {
function parMatrix(mat) {

    ////////////////////////
    // Variables definition
    ////////////////////////
    var dataset = [];
    var rowdataset = [];
    var color = d3.scale.linear()
	.domain([-1,0,1])
	.range(["blue","white","red"]);
    var nbpars = mat[1].length;
    var parnames = [];
    for (var i=0; i<nbpars; i++){
	parnames.push(mat[1][i][i].par);
    }
    for (var i=0; i<nbpars; i++){
	rowdataset.push(mat[0][i][i]);
    }
    for (var i=0; i<nbpars; i++){
	for (var j=0; j<nbpars; j++){
	    dataset.push([i,j,mat[0][i][j]]);
	} 
    }
    for (var i=0; i<nbpars; i++){
	mat[0][i][i].cc=1; // in order to have diagonal terms with maximal correlation
    }

    var maxtextlength = Math.max.apply(Math,parnames.map(function(d,i){return parnames[i].length}));
    var textfont = 12;
    var MatTotSize = 450 - maxtextlength * textfont ;
    var figsSize = MatTotSize;
    var MatMarginSize = maxtextlength * textfont;
    var MatSize = MatTotSize - MatMarginSize;
    var CellSize = MatSize/nbpars;
    var GrowFact = 1.2;


    ///////////////////////////////
    // main structures definition
    ///////////////////////////////
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
    var Figs = d3.select("#vis")
	.append("svg")
	.attr("width",MatTotSize)
	.attr("height",MatTotSize)
	.attr("x",1.5*MatTotSize + "px")
	.attr("y","0px")
	//.style("margin-left", - MatMarginSize + "px")
	.append("g")
    var Trace = Figs.select("img")
	.data(mat)
	.enter()
	.append("div")
	.attr("width",figsSize)
	.attr("height",MatTotSize/2)
	.attr("x","0px")
	.attr("y", figsSize/2+ "px")
//	.each(function(d,i){
//	    var t = d3.select(this);
//	    t.append("img")
//		.attr("src",function(d){
//		    console.log(d[0][0].png.trace_id);
//		    return 'lib/pict/' + d[0][0].png.trace_id;})
//	})

    /////////////////////////////////
    // Static initialisation of svgs
    /////////////////////////////////
    MatTot.selectAll("rect")
	.data(dataset)
	.enter()
	.append("rect")
	.attr({
	    x: function(d){ return d[0]*CellSize + "px"; },
	    y: function(d){ return d[1]*CellSize + "px"; }, 
	    width: CellSize + "px",
	    height: CellSize + "px",
	    fill: function(d) {return color(d[2].cc);}
	});
    var row = MatTot.selectAll(".row")
	.data(rowdataset)
	.enter().append("g")
	.attr("class", "row")
    row.append("text")
	.attr("x",  "-5px")
	.attr("y", function(d,i){return (i+0.5)*CellSize + textfont/2 + "px";})
	.attr("text-anchor", "end")
	.style("font-size",function(){return textfont + "px";})
	.text(function(d) { return d.par; });
    var column = MatTot.selectAll(".column")
	.data(rowdataset)
	.enter().append("g")
	.attr("class", "column")
	.attr("tranform", function(d,i) {return "translate(" + i*CellSize + "px)rotate(-90)";});
    column.append("text")
	.attr("x", "5px")
	.attr("y", function(d,i){ return (i+0.5)*CellSize + textfont/2 + "px" })
	.attr("text-anchor", "start")
	.style("font-size",function(){return textfont + "px"})
	.text(function(d) { return d.par; })
	.attr("transform", function(d,i) {return  "rotate(-90)";});
    
    
    
    //////////////////////////////////////
    // Listeners / interactive components
    //////////////////////////////////////
    MatTot.selectAll("rect")
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
		.style("width", CellSize*Math.sqrt(GrowFact) + "px")
		.style("height", CellSize*Math.sqrt(GrowFact) + "px")
	    	.style("position", "absolute")
		.style("left", pos.left -CellSize*(Math.sqrt(GrowFact)-1)/2 + "px")
	    	.style("top", pos.top - CellSize*(Math.sqrt(GrowFact)-1)/2 + "px")
		.style("z-index", 1);
	    console.log($(".mytooltip"));
	    if (indi == indj){
		$('a[rel=tooltip]').attr('data-original-title','ess: ' + ess).tooltip('fixTitle');} 
	    else {
		$('a[rel=tooltip]').attr('data-original-title','cc: ' + cc).tooltip('fixTitle');
		}
	    $('a[rel=tooltip]').tooltip("show");
	    
	    mouseov(indi,indj);
	})
	.on("mouseout",function(d){
	    d3.event.stopPropagation();
	})
    function mouseov(indi,indj){
	d3.selectAll(".row text").classed("activetext", function(d,i){
	    return i == indj;
	})
	d3.selectAll(".column text").classed("activetext", function(d,i){
	    return i == indi;
	})
    };
    Mat.on("mouseout",function(d){
	    d3.select("#ActiveMatComp").classed('hidden', true);
    });

$('a[rel=popover]').popover();
$('a[rel=tooltip]').tooltip();

};			  
			
