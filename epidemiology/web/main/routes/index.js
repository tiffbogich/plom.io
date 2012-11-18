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
