var plomGlobal = {context: '', process: '', link: '', theta: '', tree: '', _id:''};

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


function onClickNodeTree(report){

  $('#model').removeClass('hidden');

  $('#fork, #follow').removeClass('disabled');

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

  plomGlobal._id= report[report.action];
}


$(document).ready(function(){

  $('a.getTree').click(function(event){
    event.preventDefault();

    $.getJSON($(this).attr("href"), function(tree){
      $('#tree').removeClass('hidden');
      $('#explore, #fork, #follow').addClass('disabled');

      plomGlobal.tree = tree._id;

      var treeData = makeTreeData(tree);

      $('#plom-tree-graph svg').remove();

      plomGlobal.addNodeTo = plom_tree("#plom-tree-graph", treeData, onClickNodeTree);
    });

  });

  $('#explore').click(function() {
    if(! $(this).hasClass('disabled')) {
      $(this).button('loading');
      $.post("/build", {a: plomGlobal.tree, c: plomGlobal.context, p:plomGlobal.process, l: plomGlobal.link, t: plomGlobal.theta}, function(answer){
        window.location.replace('/play');
      });
    }
  });

  $('#fork').click(function(){
    $('#forkModal').modal('show');
  });

  //fix bug modal twitter bs
  $('#forkModal').on('show', function(){
    $('#upload-active').addClass('active');
  });


 $('#fork-submit').click(function(){
   $('input[name="tree_idString"]').val(plomGlobal.tree)
     .next().val(plomGlobal._id);

   $('#fork-form').ajaxSubmit({
     success: function(response) {

       $('#forkModal').modal('hide');

       var resnode = {name: response.name,
                      _id: response._id,
                      type: response.type};

       $('#forkModal').one('hidden', function () {
         d3.select('#_id' + plomGlobal._id).each(function(d){
           plomGlobal.addNodeTo(resnode, d);
         });
       });
     }
   });
 });

});
