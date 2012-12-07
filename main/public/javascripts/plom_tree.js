function makeTreeData(tree, subtree_root_id){

  var nodes = tree.node;

  //from adjacency list to tree layout.
  var map_id2name = {}, treeData = {}, root_id = '';

  nodes.forEach(function(node){
    map_id2name[node._id] = node.name;
    if(!node.parent_id) root_id = node._id;
  });

  // Create nodes for each unique source and target.
  nodes.forEach(function(node) {
    var parent = convertData(node.parent_id, node)
    , child = convertData(node._id, node);

    if (parent.children) {
      parent.children.push(child)
    } else {
      parent.children = [child];
    }
  });

  function convertData(_id, node){
    if(_id in treeData){
      return treeData[_id];
    } else {
      var name = (_id) ? map_id2name[_id] : map_id2name[root_id];
      return (treeData[_id] = {name: name, _id: _id, type: node.type});
    }
  }

  //extract root
  sub_id = subtree_root_id || root_id;
  treeData = treeData[sub_id];

  return treeData;
}


function plom_tree(callback) {
  var margin = {top: 20, right: 90, bottom: 20, left: 110},
  duration = 500;

  var myStyle = {process: {r:7.5, color: '#f15b22'},   //'#b4469a'},
                 intervention: {r:7.5, color: '#29b34a'},
                 context: {r:10.5, color: '#006fb9'},
                 link: {r:6.5, color:'gray'},
                 theta: {r:4.5, color:'#8cc48c'}};

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

      update(root);

      //we define update here to be sure that it has is own version of i (starting at 0)!
      function update(source) {
        // Compute the new tree layout.
        var nodes = tree.nodes(root).reverse();
        console.log(nodes);
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
            return d.children ? -dx : dx; })
          .attr("dy", ".35em")
          .attr("text-anchor", function(d) { return d.children ? "end" : "start"; })
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

        var report = {};

        var mynode = d;
        if (d.type === 'theta'){

          //find _id of link, context and model for that theta...
          report['action'] = 'theta'
          report['theta'] = mynode._id;
          ['link', 'process', 'context'].forEach(function(type){
            while(mynode.type !== type && mynode.depth){
              mynode = mynode.parent;
            }
            report[type] = mynode._id;
          });

        } else if(d.type === 'link') {

          report['action'] = 'link';
          report['link'] = mynode._id;
          ['process', 'context'].forEach(function(type){
            while(mynode.type !== type && mynode.depth){
              mynode = mynode.parent;
            }
            report[type] = mynode._id;
          });

        } else if(d.type === 'process') {

          report['action'] = 'process';
          report['process'] = mynode._id;
          while(mynode.type !== 'context' && mynode.depth){
              mynode = mynode.parent;
            }
            report['context'] = mynode._id;

        } else {
          report['action'] = 'context';
          report['context'] = mynode._id;
        }

        callback(report, d, tree, update);
        //update(d);
      }
    });
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


//      function breadthFirstSearch(my) {
//
//        while (queue.length) {
//          var node = queue.shift();
//
//          if (node.name === my) {
//            //found!
//            return node;
//          } else {
//            if (node.children) {
//              node.children.forEach(function(el){
//                queue.push(el);
//              });
//            }
//          }
//        }
//
//        //not found
//        return {};
//      }
