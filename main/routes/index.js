var fs = require('fs')
  , jade = require('jade')
  , jadevu = require('jadevu')
  , describeTheta = require('../lib/helper').describeTheta
  , PlomTrees = require('../../db').PlomTrees
  , check = require('validator').check
  , mongodb = require('mongodb')
  , spawn = require('child_process').spawn
  , ObjectID = require('mongodb').ObjectID
  , path = require('path');



exports.play = function(req, res, next){

  var a = req.query.a
    , c = req.query.c
    , p = req.query.p
    , l = req.query.l
    , t = req.query.t;

  var trees = req.app.get('trees')
    , components = req.app.get('components');

  components.findOne({_id: new ObjectID(c)}, function(err, cDoc){
    if(err) return next(err);
    components.findOne({_id: new ObjectID(p)}, function(err, pDoc){
      if(err) return next(err);
      components.findOne({_id: new ObjectID(l)}, function(err, lDoc){
        if(err) return next(err);
        components.findOne({_id: new ObjectID(t)}, function(err, tDoc){
          if(err) return next(err);
          trees.findOne({_id: new ObjectID(a)}, function(err, aDoc){
            if(err) return next(err);

            var path_settings =  path.join(process.env.HOME, 'plom_models', c, p, l, 'settings', 'settings.json');

            fs.readFile(path_settings, function (err, settings){
              if(err) return next(err);

              settings = JSON.parse(settings);
              res.format({
                json: function(){
                  res.send({settings: settings, tree: aDoc, process: pDoc, context_id: cDoc._id, link: lDoc, theta: tDoc});
                },
                html: function(){
                  describeTheta(tDoc, pDoc, lDoc);
                  res.render('play', {settings:settings, theta:tDoc});
                }
              });
            });

          });
        });
      });
    });
  });
}



/**
 * Build model (POST request)
 */
exports.build = function(req, res, next){

  var c = req.body.c
    , p = req.body.p
    , l = req.body.l;

  var path_rendered = path.join(process.env.HOME, 'plom_models', c, p, l);
  fs.exists(path_rendered, function (exists) {

    if(!exists){
      var components = req.app.get('components');
      components.findOne({_id: new ObjectID(c)}, function(err, cDoc){
        if(err) return next(err);
        components.findOne({_id: new ObjectID(p)}, function(err, pDoc){
          if(err) return next(err);
          components.findOne({_id: new ObjectID(l)}, function(err, lDoc){
            if(err) return next(err);


            var pmbuilder = spawn('pmbuilder', ['--input', 'stdin', '--web', '-o', path_rendered]);

            pmbuilder.stdin.write(JSON.stringify({context: cDoc, process: pDoc, link: lDoc})+'\n', encoding="utf8");
            //echo
            //pmbuilder.stdout.on('data', function (data) {console.log('stdout: ' + data);});
            //pmbuilder.stderr.on('data', function (data) {console.log('stderr: ' + data);});

            pmbuilder.on('exit', function (code) {
              if(code === 0) {
                res.json({ success: 'ready!' })
              } else {
                res.json(500, { error: 'FAIL' })
              }
            });

          });
        });
      });
    } else {
      res.json({ success: 'ready!' })
    }

  });
}





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
