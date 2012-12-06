var fs = require('fs')
  , jade = require('jade')
  , jadevu = require('jadevu')
  , describePar = require('../lib/helper').describePar
  , PlomTrees = require('../../db').PlomTrees
  , check = require('validator').check
  , mongodb = require('mongodb')
  , ObjectID = require('mongodb').ObjectID
  , path = require('path');


/**
 *Serve PlomSettings in JSON or HTML
 */
exports.play = function(req, res, next){

  var s = req.query.s || 'tutorial';
  var c = req.query.c || 'homogeneous-mixing';
  var p = req.query.p || ((s === 'tutorial') ? 'SI-g2R' : 'SIR-mHB2');
  var l = req.query.l || 'default';

  var path_settings =  path.join(process.env['HOME'], 'demo', s, p, c, l, 'model', 'settings', 'settings.json');

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
  var q = req.query.q || '';

  var trees = req.app.get('trees')
    , components = req.app.get('components');

  var ptrees =  new PlomTrees(components, trees);

  ptrees.search(q, function(err, cursor){
    if(err) return next(err);

    cursor.toArray(function(err, docs){
      if(err) return next(err);
      res.render('library', {q:q, results:docs});
    });
  });


};


exports.trees = function (req, res, next) {

  var _idString = req.query._idString;

  if (_idString){
    var trees = req.app.get('trees');
    trees.findOne({_id: new ObjectID(_idString)}, function(err, doc){
      if(err) return next(err);

      if(doc){
        res.json(doc);
      } else {
        res.json(500, { error: 'could not find tree' })
      }
    });
  } else {
    res.json(500, { error: 'invalid URL' });
  }

};


exports.components = function (req, res, next) {

  var _idString = req.query._idString;

  if (_idString){
    var components = req.app.get('components');
    components.findOne({_id: new ObjectID(_idString)}, function(err, doc){
      if(err) return next(err);

      if(doc){
        res.json(doc);
      } else {
        res.json(500, { error: 'could not find component' })
      }
    });
  } else {
    res.json(500, { error: 'invalid URL' });
  }

};




//exports.test = function(req, res){
//    var t = jade.compile(fs.readFileSync('/Users/seb/websites/simforence/simforence-web/sfr-gui//views/test.jade'))();
////    console.log(t);
//    res.send(t);
//};
