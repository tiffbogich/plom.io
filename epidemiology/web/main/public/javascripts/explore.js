$(document).ready(function(){

    $.getJSON('/play', function(answer){

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

    d3.select("#sfr-tree-graph")
        .datum(data)
        .call(sfr_tree());

});


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
