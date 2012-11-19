var fs = require('fs')
, jade = require('jade')
, jadevu = require('jadevu')
, describePar = require('../lib/helper').describePar
, path = require('path');

/**
 *Serve PlomSettings in JSON or HTML
 */
exports.play = function(req, res, next){

  var s = req.query.s || 'tutorial';
  var c = req.query.c || 'homogeneous-mixing';
  var p = req.query.p || ((s === 'tutorial') ? 'SI-g2R' : 'SIR-mHB2');
  var l = req.query.l || 'default';

  console.log(req.query, s, c, p);
  var path_settings =  path.join(process.env['HOME'], 'demo', s, p, c, l, 'model', 'settings', 'settings.json');
  console.log(path_settings);

  fs.readFile(path_settings, function (err, settings){

    if(err){
      next(err);
      return;
    }

    settings = JSON.parse(settings);

    res.format({
      json: function(){

        res.send({settings: settings,
                  story: s,
                  context: c,
                  process: p,
                  link: l});

      },
        html: function(){

          var path_process = path.join(process.env['HOME'], 'demo',  s, p, 'process.json');
          fs.readFile(path_process, function (err, proc){

            if(err){
              next(err);
              return;
            }

            proc = JSON.parse(proc);
            describePar(settings, proc);
            res.render('play', settings);
          });

        }
    });
  });

};


exports.index = function(req, res){
  res.render('index');
};


exports.library = function(req, res){
  var q = req.query.q || 'tutorial';
  res.render('library', {q:q});
};


exports.process = function (req, res, next) {
  var path_process = path.join(process.env['HOME'], 'demo',  req.query.s, req.query.p, 'process.json');
  console.log(path_process);
  res.sendfile(path_process);
}


exports.tree = function (req, res, next) {
  var path_tree =  path.join(process.env['HOME'], 'demo',  req.query.q, 'tree.json');
  res.sendfile(path_tree);
};


//exports.test = function(req, res){
//    var t = jade.compile(fs.readFileSync('/Users/seb/websites/simforence/simforence-web/sfr-gui//views/test.jade'))();
////    console.log(t);
//    res.send(t);
//};
