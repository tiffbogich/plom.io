var plomGlobal = {context: '', process: '', link: '', theta: '', tree: '', node:null};

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


function onClickNodeTree(report, node, d3tree, update){
  $('#model').removeClass('hidden');

  $('#fork, #attach, #follow').removeClass('disabled');

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

  plomGlobal.node=node;
  plomGlobal.d3tree=d3tree;
  plomGlobal.update=update;
}


$(document).ready(function(){

  $('a.getTree').click(function(event){
    event.preventDefault();

    $.getJSON($(this).attr("href"), function(tree){
      $('#tree').removeClass('hidden');
      $('#explore, #fork, #attach, #follow').addClass('disabled');


      plomGlobal.tree = tree._id;

      var treeData = makeTreeData(tree);

      $('#plom-tree-graph svg').remove();
      d3.select("#plom-tree-graph")
        .datum(treeData)
        .call(plom_tree(onClickNodeTree));
    });

  });

  $('#explore').click(function() {
    if(! $(this).hasClass('disabled')) {
      $(this).button('loading');
      console.log(plomGlobal);
      $.post("/build", {a: plomGlobal.tree, c: plomGlobal.context, p:plomGlobal.process, l: plomGlobal.link, t: plomGlobal.theta}, function(answer){
        window.location.replace('/play');
      });
    }
  });


  $('#fork').click(function(){
    $('#myModal').modal('show');
  });


 $('#fork-submit').click(function(){

   $('#fork-form').ajaxSubmit({
     success: function(response) {

       var newnodes = plomGlobal.d3tree.nodes({name:"WTF", type:'context'}).reverse();

       if('children' in plomGlobal.node){
         plomGlobal.node.children.push(newnodes[0]);
       } else {
         plomGlobal.node.children = newnodes;
       };
       console.log(plomGlobal.node);
       $('#myModal').modal('hide')

       $('#myModal').on('hidden', function () {
         plomGlobal.update(plomGlobal.node);
       })

     }
   });

 });





});
