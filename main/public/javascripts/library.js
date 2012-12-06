var plomGlobal = {context: '', process: '', link: '', theta: '', tree: ''};

function makeTreeData(tree){

  var nodes = tree.node;

  //from adjacency list to tree layout.
  var map_id2name = {}, treeData = {}, root_id= '';

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
  treeData = treeData[root_id];

  return treeData;
}


function updateContext(idString){

  $.getJSON('/component?_idString=' + idString, function(component){

    $('#plom-horizon-graph svg').remove();

    if('data' in component && _.isArray(component.data) && _.isArray(component.data[0].source)){
      //locate data in context.data array:
      for(var i=0; i<component.data.length; i++){
        if(component.data[i]['id'] === 'data'){
          break;
        }
      };

      var source = component.data[i]['source'].slice(1)
        , data = [];
      for(var col=1; col< source[0].length; col++){
        data.push(source.map(function(row) {return [new Date(row[0]), row[col]] }));
      }

      plom_horizon(data);
    }
  })
}

function updateProcess(idString){
  $.getJSON('/component?_idString=' + idString, function(component){
    $('#plom-detail-model svg').remove();
    plomGraphModel(component, '#plom-detail-model');
  })
}



$(document).ready(function(){

  $('a.getTree').click(function(event){
    event.preventDefault();

    $.getJSON($(this).attr("href"), function(tree){
      plomGlobal.tree = tree._id;

      var treeData = makeTreeData(tree);

      $('#plom-tree-graph svg').remove();

      d3.select("#plom-tree-graph")
        .datum(treeData)
        .call(plom_tree(function(report){ //callback onClickNode

          if(report.action === 'theta'){
            $('button#explore').removeClass('disabled');
          } else {
            $('button#explore').addClass('disabled');
          }

          //update time series:
          if(plomGlobal.context !== report.context){
            plomGlobal.context = report.context;
            updateContext(report.context);
          }

          if(report.process && (plomGlobal.process !== report.process)){
            plomGlobal.process = report.process;
            updateProcess(report.process);
          }

          if(report.link && (plomGlobal.link !== report.link)){
            //TODO
            plomGlobal.link = report.link;
          }

          if(report.theta && (plomGlobal.theta !== report.theta)){
            //TODO
            plomGlobal.theta = report.theta;
          }

        }));
    });

  });


  $('#explore').click(function() {
    if(! $('#button#explore').hasClass('disabled')) {
      window.location.replace('/play?r=' + plomGlobal.tree + '&c=' + plomGlobal.context + '&p=' + plomGlobal.process + '&l=' + plomGlobal.link + '&t=' + plomGlobal.theta);
    }
  });


});
