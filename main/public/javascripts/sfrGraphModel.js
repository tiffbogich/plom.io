function sfrGraphModel(process, graphId) {

  var graph = {nodes:[], links:[]};

  process.state.forEach(function(s, i){
    graph.nodes.push({name: s.id,
                      type: 'basic',
                      comment: s.comment || ''});
  });

  var states = process.state.map(function(x){return x.id});

  //add DU
  graph.nodes.push({name:'DU',
                    type:'DU',
                    comment: 'Disease Universe'});
  states.push('DU');

  var is_DU = false;
  process.model.forEach(function(r, i){
    if(r.from !== 'U' && r.to !== 'U'){

      if (r.from === 'DU' || r.to === 'DU') {
        is_DU = true;
      }

      var myLink =  {source: states.indexOf(r.from),
                     target: states.indexOf(r.to),
                     type: 'basic'};

      if (r.tag && (r.tag[0].id === 'transmission')) {
        myLink.type = 'transmission'

        r.tag[0].by.forEach(function(x){
          var ind = states.indexOf(x);
          graph.nodes[ind].type = 'infector';
        });

      } else if (r.tag && (r.tag[0].id === 'erlang')) {
        var ind = states.indexOf(r.from);
        graph.nodes[ind].type = 'erlang';
      }

      graph.links.push(myLink);

    } else if (r.from === 'U' && r.to !== 'U') {
      var ind = states.indexOf(r.to);
      graph.nodes[ind].type = 'source';
    }
  });

  if (! is_DU) {
    graph.nodes.pop();
  }

  var width = 300
  , height = 300;


  var svg = d3.select(graphId).append("svg:svg")
    .attr("width", width)
    .attr("height", height);


  var n = graph.nodes.length;
  graph.nodes.forEach(function(d, i) {
    d.x = width / n * i;
    d.y = height/2 + Math.round(Math.random()*20 -10);
  });


  var force = d3.layout.force()
    .nodes(graph.nodes)
    .links(graph.links)
    .size([width, height])
    .linkDistance(50)
    .charge(-300)
    .on("tick", tick)
    .start();

  // Per-type markers, as they don't inherit styles.
  svg.append("defs").selectAll("marker")
    .data(["basic", "transmission"])
    .enter().append("svg:marker")
    .attr("id", String)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 15)
    .attr("refY", -1.5)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5");

  var path = svg.append("g").selectAll("path")
    .data(graph.links)
    .enter().append("path")
    .attr("class", function(d) { return "link " + d.type; })
    .attr("marker-end", function(d) { return "url(#" + d.type + ")"; });


  var circle = svg.append("g").selectAll("circle")
    .data(graph.nodes)
    .enter().append("circle")
    .attr("r", 6)
    .attr("class", function(d){return d.type;})
    .call(force.drag);

  var text = svg.append("g").selectAll("g")
    .data(graph.nodes)
    .enter().append("g");

  // A copy of the text with a thick white stroke for legibility.
  text.append("text")
    .attr("x", 8)
    .attr("y", ".31em")
    .attr("class", "shadow")
    .text(function(d) { return d.name; });

  text.append("text")
    .attr("x", 8)
    .attr("y", ".31em")
    .text(function(d) { return d.name; });

  text.append("text")
    .attr('id', function(d) {return d.name;})
    .attr('class', "hidden shadow")
    .attr("x", 8)
    .attr("y", ".31em")
    .text(function(d) { return d.name + ':' + d.comment; });

  circle.on('mouseover', function(d,i){
    d3.select('#'+ d.name).classed('hidden', false);
  });
  circle.on('mouseout', function(d,i){
    d3.select('#'+ d.name).classed('hidden', true);
  });


  // Use elliptical arc path segments to doubly-encode directionality.
  function tick() {
    path.attr("d", function(d) {
      var dx = d.target.x - d.source.x,
      dy = d.target.y - d.source.y,
      dr = Math.sqrt(dx * dx + dy * dy);
      return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
    });

    circle.attr("transform", function(d) {
      return "translate(" + d.x + "," + d.y + ")";
    });

    text.attr("transform", function(d) {
      return "translate(" + d.x + "," + d.y + ")";
    });
  }
};
