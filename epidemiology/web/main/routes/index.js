var fs = require('fs')
, jade = require('jade')
, jadevu = require('jadevu')
, describePar = require('../lib/helper').describePar;


/**
 *Serve Sfrsettings in JSON or HTML
 */
exports.sfrSettings = function(path_settings, path_model){

  return function(req, res, next){

    fs.readFile(path_settings, function (err, settings){

      if(err){
        next(err);
        return;
      }

      fs.readFile(path_model, function (err, model){

        if(err){
          next(err);
          return;
        }

        settings = JSON.parse(settings);
        describePar(settings);
        model = JSON.parse(model);

        res.format({
          json: function(){
            res.send({settings:settings, model:model});
          },
          html: function(){
            res.render('play', settings);
          }
        });
      });

    });

  };

};

exports.index = function(req, res){
  res.render('index');
};


exports.explore = function(req, res){
  res.render('explore');
};


//exports.settingsJSON = function (req, res, next) {
//    fs.createReadStream(process.env['HOME'] + '/tutorial/settings/settings.json').pipe(res);
//}


//exports.test = function(req, res){
//    var t = jade.compile(fs.readFileSync('/Users/seb/websites/simforence/simforence-web/sfr-gui//views/test.jade'))();
////    console.log(t);
//    res.send(t);
//};
