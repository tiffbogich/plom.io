var plomGlobal = {link: null, context: null, process: null};

$(document).ready(function(){


  $('#submit-search').click(function(event){
    event.preventDefault();
    window.location.replace('/library?q=' + $('#search').val());
  });


  var storyId = $('#search').val();

  $.getJSON('/play?s=' + storyId, function(answer){

    var data = [];

    var x = answer.settings.data.dates;
    var y = answer.settings.data.data;

    if(y.length >0) {
      for(var i=0; i< y[0].length; i++){
        data.push(x.map(function(d, n) {return [new Date(d), y[n][i]] }));
      }
    }

    sfr_horizon(data);

  });

  var a = $.getJSON('/tree?q='+storyId, function(answer){
    d3.select("#plom-tree-graph")
      .datum(answer)
      .call(sfr_tree($('#explore'), function(processId){

        $.getJSON('/process?s='+storyId + '&p='+processId, function(answer){
          $('#plom-graph-process svg').remove();
          sfrGraphModel(answer, '#plom-graph-process');
        });

      }));
  });

  $('#explore').click(function() {
    if(plomGlobal.link && plomGlobal.context && plomGlobal.process) {
      window.location.replace('/play?s=' + storyId + '&c=' + plomGlobal.context + '&p=' + plomGlobal.process + '&l=' + plomGlobal.link);
    }
  });


});
