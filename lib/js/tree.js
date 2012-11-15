function sfr_tree() {
  var margin = {top: 20, right: 120, bottom: 20, left: 80},
    duration = 500;

    var myStyle = {model: {r:15.5, color:'red'},
                   intervention: {r:15.5, color:'orange'},
                   context: {r:7.5, color:'blue'},
                   link: {r:4.5, color:'gray'},
                   zazaza: {r:4.5, color:'gray'}};

    var width = 580 - margin.right - margin.left,
    height = 400 - margin.top - margin.bottom;


    var diagonal = d3.svg.diagonal()
        .projection(function(d) {
            return [d.y, d.x];
        });

    function my(selection) {

        selection.each(function(data, j) {
            var i=0;

            var tree = d3.layout.tree()
                .size([height, width])

            var vis = d3.select(this)
                .append("svg")
                .attr("width", width + margin.right + margin.left)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


            var root = data;
            root.x0 = height / 2;
            root.y0 = 0;

            root.children.forEach(collapse);
            update(root);

            //we define update here to be sure that it has is own version of i (starting at 0)!
            function update(source) {
                // Compute the new tree layout.
                var nodes = tree.nodes(root).reverse();
                // Normalize for fixed-depth.
                //nodes.forEach(function(d) { d.y = d.depth * 100; });

                // Update the nodes…
                var node = vis.selectAll("g.node")
                    .data(nodes, function(d) {
                        return d.id || (d.id = ++i);
                    });

                // Enter any new nodes at the parent's previous position.
                var nodeEnter = node.enter().append("g")
                    .attr("class", "node")
                    .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
                    .on("click", click);

                nodeEnter.append("circle")
                    .attr("r", 1e-6)
                    .style("fill", function(d) { return myStyle[d.type]['color']; })
                    .on("mouseover", function(d,i){
                        d3.select(this).style("stroke", 'black');
                    })
                    .on("mouseout", function(d,i){
                        d3.select(this).style("stroke", 'white');
                    });


                nodeEnter.append("text")
                    .attr("dx", function(d) {
                        var dx = myStyle[d.type]['r']+3;
                        return d.children || d._children ? -dx : dx; })
                    .attr("dy", ".35em")
                    .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
                    .text(function(d) { return d.name; })
                    .style("fill-opacity", 1e-6);

                // Transition nodes to their new position.
                var nodeUpdate = node.transition()
                    .duration(duration)
                    .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

                nodeUpdate.select("circle")
                    .attr("r", function(d) { return myStyle[d.type]['r']; })
                    .style("fill", function(d) { return myStyle[d.type]['color']; });

                nodeUpdate.select("text")
                    .style("fill-opacity", 1);

                // Transition exiting nodes to the parent's new position.
                var nodeExit = node.exit().transition()
                    .duration(duration)
                    .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
                    .remove();

                nodeExit.select("circle")
                    .attr("r", 1e-6);

                nodeExit.select("text")
                    .style("fill-opacity", 1e-6);


                // Update the links…
                var link = vis.selectAll("path.link")
                    .data(tree.links(nodes), function(d) { return d.target.id; });

                // Enter any new links at the parent's previous position.
                link.enter().insert("path", "g")
                    .attr("class", "link")
                    .attr("d", function(d) {
                        var o = {x: source.x0, y: source.y0};
                        return diagonal({source: o, target: o});
                    });

                // Transition links to their new position.
                link.transition()
                    .duration(duration)
                    .attr("d", diagonal);

                // Transition exiting nodes to the parent's new position.
                link.exit().transition()
                    .duration(duration)
                    .attr("d", function(d) {
                        var o = {x: source.x, y: source.y};
                        return diagonal({source: o, target: o});
                    })
                    .remove();

                // Stash the old positions for transition.
                nodes.forEach(function(d) {
                    d.x0 = d.x;
                    d.y0 = d.y;
                });
            }


            // Toggle children on click.
            function click(d) {
                if ((d.type === 'context') && d.children) {
                    d._children = d.children;
                    d.children = null;
                } else if((d.type === 'context')) {
                    d.children = d._children;
                    d._children = null;
                } else if ((d.type === 'link')){
                    //find context and model for that link...
                    var mynode = d;
                    while(mynode.type !== 'context'){
                        mynode = mynode.parent;
                    }
                    console.log(mynode.name, mynode.parent.name);
                }
                update(d);
            }
        });

    }


    function collapse(d) {
        if (d.children) {
            if(d.type === 'context'){
                d._children = d.children;
            }
            d.children.forEach(collapse);
            if(d.type === 'context'){
                d.children = null;
            }
        }
    }


    my.width = function(value) {
        if (!arguments.length) return width;
        width = value;
        return my;
    };

    my.height = function(value) {
        if (!arguments.length) return height;
        height = value;
        return my;
    };


    return my;
}


var data = {
    "name": "SI",
    "type": "model",
    "children": [
        {
            "name": "Simple",
            "type": "context",
            "children": [
                {
                    "name": "link 1",
                    "type": "link",
                    "privacy": "public",
                    "children": [
                        {"name": "link 2", "type": "link"},
                        {"name": "link 3", "type": "link"},
                        {"name": "link 4", "type": "link"}
                    ]
                },
                {
                    "name": "link5",
                    "type": "link",
                    "privacy": "public",
                    "children": [
                        {"name": "link 6", "type": "link"},
                        {"name": "link 7", "type": "link"}
                    ]
                }
            ]
        },
        {
            "name": "Age",
            "type": "context",
            "children": [
                {
                    "name": "link13",
                    "type": "link",
                    "children": [
                        {"name": "link 8",
                         "type": "link",
                         "children": [
                             {"name": "link 9", "type": "link"}
                         ]},
                        {"name": "link 10", "type": "link"}
                    ]
                },
                {"name": "link 11", "type": "link"},
                {"name": "link 12", "type": "link"}
            ]
        },
        {
            "name": "SIR",
            "type": "model",
            "children": [{"name": "Simple", "type": "context", "children":[
                {"name": "link 19", "type": "link"}
            ]},
                         {
                             "name": "Vaccination",
                             "type": "intervention"
                         }
                        ]
        }
    ]
};


d3.select("#sfr-tree-graph")
  .datum(data)
  .call(sfr_tree());
