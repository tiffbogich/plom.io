var fs = require('fs')
, jade = require('jade')
, jadevu = require('jadevu')
, describePar = require('../lib/helper').describePar;


/**
 *Serve PlomSettings in JSON or HTML
 */
exports.play = function(req, res, next){

  var path_settings = process.env['HOME'] + '/tutorial/settings/settings.json';

  fs.readFile(path_settings, function (err, settings){

    if(err){
      next(err);
      return;
    }

    settings = JSON.parse(settings);
    describePar(settings);

    res.format({
      json: function(){
        res.send(settings);
      },
      html: function(){
        res.render('play', settings);
      }
    });
  });

};


exports.index = function(req, res){
  res.render('index');
};


exports.library = function(req, res){
  res.render('library');
};


exports.process = function (req, res, next) {
  var path_process =   process.env['HOME'] + '/websites/simforence/simforence-population-based/simforence_model_builder/examples/hfmd/process.json';

  fs.createReadStream(path_process).pipe(res);
}


//exports.test = function(req, res){
//    var t = jade.compile(fs.readFileSync('/Users/seb/websites/simforence/simforence-web/sfr-gui//views/test.jade'))();
////    console.log(t);
//    res.send(t);
//};

exports.tree = function (req, res, next) {

  var tree = {
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
  }

  res.send(tree);
};
