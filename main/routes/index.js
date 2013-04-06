var fs = require('fs')
  , describeTheta = require('../lib/helper').describeTheta
  , check = require('validator').check
  , mongodb = require('mongodb')
  , spawn = require('child_process').spawn
  , ObjectID = require('mongodb').ObjectID
  , path = require('path')
  , async = require('async')
  , _ = require('underscore')
  , fstream = require("fstream")
  , tar = require("tar")
  , zlib = require("zlib")
  , dbUtil = require('../../db-utils');


exports.welcome = function(req, res){
  res.render('welcome');
};

exports.about = function(req, res){
  res.render('about');
};


exports.index = function(req, res){

  var components = req.app.get('components');

  var q = (req.body.q) ? dbUtil.querify(req.body.q, req.body.d) : {type: 'link'};

  components.find(q, {context_id:1, process_id:1, theta_id:1, name:1, parameter:1, model:1}).toArray(function(err, links){
    if (err) return next(err);


    async.parallel({
      context: function(callback){
        components
          .find({_id: {$in: _.uniq(links.map(function(x){return x.context_id;}))}})
          .toArray(function(err, c){
            if (err) callback(err);

            //keep only the data as opposed to the meta data
            c.map(function(x, i){
              var data = x.data.filter(function(d){return d.id ==='data'})[0];
              x.data = data.source.slice(1);
            });

            callback(null, c);

          });
      },

      process: function(callback){
        components
          .find({_id: {$in: _.uniq(links.map(function(x){return x.process_id;})) }})
          .toArray(function(err, p){
            if (err) callback(err);

            callback(null, p);

          });
      },

      theta: function(callback){
        //only fetch the best theta!
        components
          .find({_id: {$in: _.uniq(_.flatten(links.map(function(x){return x.theta_id;}))) }}) //TODO restrict to status: 'best'
          .toArray(function(err, t){
            if (err) callback(err);

            callback(null, t);

          });
      },

      //all the links related to the process model of the links matching our query
      related: function(callback){
        components
          .find({type: 'link', process_id: {$in: _.uniq(links.map(function(x){return x.process_id;}))}}, {context_disease:1, process_id:1})
          .toArray(function(err, r){
            if (err) callback(err);

            callback(null, r);
          });
      },


    },
                   function(err, results) {
                     if (err) return next(err);

                     var obj = {};
                     for(var x in results){
                       if(x!=='related'){
                         results[x].forEach(function(comp){
                           obj[comp._id] = comp;
                         });
                       }
                     }

                     //add related content (other diseases where the process model is also used)
                     results.related.forEach(function(r){
                       if('related' in obj[r.process_id]) {
                         //add to set of disease (TODO: optimize)
                         obj[r.process_id].related = _.unique(obj[r.process_id].related.concat(r.context_disease));
                       } else {
                         obj[r.process_id].related = r.context_disease;
                       }
                     });

                     //make a context tree (ctree)
                     var ctree = results.context;
                     ctree.forEach(function(c, i){

                       //attach models
                       c['model'] = [];
                       var mylinks = links.filter(function(x){return x.context_id.equals(c._id)});
                       mylinks.forEach(function(link){

                         var model = {
                           process: obj[link.process_id],
                           link: link,
                           theta: obj[link.theta_id.filter(function(x){return x in obj})[0]]
                         }
                         if(model.theta){
                           describeTheta(model.theta, model.process, model.link);
                         }
                         c.model.push(model);
                       });

                       //TODO sort by DIC first then AICc (Bayesian methods win)


                     });


                     res.format({
                       json: function(){
                         res.send(ctree);
                       },
                       html: function(){
                         res.render('index', {ctree:ctree});
                       }
                     });

                   });
  });

};

/**
 * POST request: Build model (if needed) and redirect to review
 */
exports.postIndex = function(req, res, next){

  var c = req.session.context = req.body.context
    , p = req.session.process = req.body.process
    , l = req.session.link = req.body.link;

  var buildPath = path.join(process.env.HOME, 'built_plom_models', l, 'model');

  fs.exists(buildPath, function(exists){

    if (exists) {
      res.redirect('/review');
    } else {

      var components = req.app.get('components');

      components.find({_id: {$in: [c, p, l].map(function(x){return new ObjectID(x);})}}).toArray(function(err, docs){
        if (err) return next(err);

        var model = {};
        docs.forEach(function(x){
          model[x.type] = x;
        });

        var pmbuilder = spawn('pmbuilder', ['--input', 'stdin', '-o', buildPath]);
        pmbuilder.stdin.write(JSON.stringify(model)+'\n', encoding="utf8");

        pmbuilder.on('exit', function (code_pmbuilder) {
          if(code_pmbuilder === 0) {
            var make = spawn('make', ['-f', 'Makefile_web', 'CC=gcc-4.7', 'install'], {cwd:path.join(buildPath, 'C', 'templates')});

            make.on('exit', function (code_make) {
              if(code_make === 0){
                res.redirect('/review');
              } else {
                return next(new Error('make error ' + code_make));
              }
            });
          } else {
            return next(new Error('pmbuilder error ' + code_pmbuilder));
          }
        });

      });
    }
  });

};



/**
 * POST request: send a model to client
 */
exports.postFork = function(req, res, next){

  var c = req.body.context
    , p = req.body.process
    , l = req.body.link
    , t = req.body.theta;

  var downloadPath = path.join(process.env.HOME, 'download_plom_models', l);

  fs.exists(downloadPath+ '.tar.gz', function(exists){

    if (exists) {
      res.download(downloadPath+ '.tar.gz');
    } else {

      var components = req.app.get('components');

      components.find({_id: {$in: [c, p, l, t].map(function(x){return new ObjectID(x);})}},
                      {_id:0, design:0, _keywords:0, semantic_id:0, information_criterion:0, context_name:0, context_id:0, process_id:0, process_name:0, theta_id:0}
                     ).toArray(function(err, docs){
        if (err) return next(err);

        fs.mkdir(downloadPath, function(){

          async.each(docs, function(doc, callback){
            fs.writeFile(path.join(downloadPath, doc.type + '.json'), JSON.stringify(doc, null, 2), function(err){
              callback(err);
            });
          }, function(err){

            if (err) return next(err);

            var writestream = fs.createWriteStream(downloadPath + '.tar.gz');
            fstream.Reader({path: downloadPath, type: "Directory"})
              .pipe(tar.Pack())
              .pipe(zlib.createGzip())
              .pipe(writestream);

            writestream.on('close', function(){
              res.download(downloadPath+ '.tar.gz');
            });

          });

        });
      });
    }
  });

};



exports.review = function(req, res, next){

  var c = req.session.context
    , p = req.session.process
    , l = req.session.link;

  //TODO check session exists

  var components = req.app.get('components');

  components.find({_id: {$in: [c, p, l].map(function(x){return new ObjectID(x);})}}).toArray(function(err, docs){
    if (err) return next(err);

    var comps = {};
    docs.forEach(function(x){
      comps[x.type] = x;
    });

    res.format({
      html: function(){
        var u = req.app.get('users');
        u.findOne({_id: req.session.username}, function(err, user){
          if (err) return next(err);

          res.render('review/index', {
            diseaseName: comps.context.disease.join('; '),
            contextName: comps.context.name,
            modelName: comps.process.name + ' - ' + comps.link.name,
            context_id: comps.context._id,
            context_followed: (user.context_id || []).indexOf(comps.context._id) !== -1
          });

        });

      },


      json: function(){
        components
          .find({_id: {$in: comps.link.theta_id}})
          .toArray(function(err, thetas){
            if (err) return next(err);

            comps.thetas = thetas;
            res.json({
              tpl:{ //TODO browserify...
                control: fs.readFileSync(path.join(req.app.get('views'),'review', 'tpl','control.ejs'), 'utf8'),
                summaryTable: fs.readFileSync(path.join(req.app.get('views'),'review', 'tpl','summary_table.ejs'), 'utf8'),
                parameters: fs.readFileSync(path.join(req.app.get('views'),'review', 'tpl','parameters.ejs'), 'utf8'),
                ticks: fs.readFileSync(path.join(req.app.get('views'),'review', 'tpl','ticks.ejs'), 'utf8'),
                reviews: fs.readFileSync(path.join(req.app.get('views'),'review', 'tpl','reviews.ejs'), 'utf8').replace('<%= token %>', req.session._csrf)
              },
              comps: comps
            });
          });
      }
    });
  });
};


exports.trace = function(req, res, next){

  var diag = req.app.get('diag')
    , _id = new ObjectID(req.params._id);

  diag.findOne({_id: _id}, function(err, doc){
    res.set('Content-Type', doc["content-type"]);
    res.end(doc.data.buffer);
  });

};









//exports.play = function(req, res, next){
//
//  var a = req.session.tree
//    , c = req.session.context
//    , p = req.session.process
//    , l = req.session.link
//    , t = req.session.theta;
//
//  if('t' in req.query){
//    t = req.query.t;
//    req.session.theta = t;
//  }
//
//  var trees = req.app.get('trees')
//    , components = req.app.get('components');
//
//  components.findOne({_id: new ObjectID(c)}, function(err, cDoc){
//    if(err) return next(err);
//    components.findOne({_id: new ObjectID(p)}, function(err, pDoc){
//      if(err) return next(err);
//      components.findOne({_id: new ObjectID(l)}, function(err, lDoc){
//        if(err) return next(err);
//        components.findOne({_id: new ObjectID(t)}, function(err, tDoc){
//          if(err) return next(err);
//          trees.findOne({_id: new ObjectID(a)}, function(err, aDoc){
//            if(err) return next(err);
//
//            var path_settings =  path.join(process.env.HOME, 'plom_models', c, p, l, 'settings', 'settings.json');
//
//            fs.readFile(path_settings, function (err, settings){
//              if(err) return next(err);
//
//              settings = JSON.parse(settings);
//
//              //in case of intervention, remove data
//              for(par in tDoc.value){
//                if ('intervention' in tDoc.value[par] && tDoc.value[par]['intervention']){
//                  settings.cst.N_DATA = 0;
//                  if('data' in settings.data){
//                    settings.data.data = [];
//                  }
//                  break;
//                }
//              }
//
//              res.format({
//                json: function(){
//                  res.send({settings: settings, tree: aDoc, process: pDoc, context_id: cDoc._id, link: lDoc, theta: tDoc});
//                },
//                html: function(){
//                  describeTheta(tDoc, pDoc, lDoc);
//                  res.render('play', {settings:settings, theta:tDoc});
//                }
//              });
//            });
//
//          });
//        });
//      });
//    });
//  });
//}
//
//
//
///**
// * Build model (POST request)
// */
//exports.build = function(req, res, next){
//
//  var a = req.session.tree = req.body.a
//    , c = req.session.context = req.body.c
//    , p = req.session.process = req.body.p
//    , l = req.session.link = req.body.l
//    , t = req.session.theta = req.body.t;
//
//  var path_rendered = path.join(process.env.HOME, 'plom_models', c, p, l);
//  fs.exists(path_rendered, function (exists) {
//
//    if(!exists){
//      var components = req.app.get('components');
//      components.findOne({_id: new ObjectID(c)}, function(err, cDoc){
//        if(err) return next(err);
//        components.findOne({_id: new ObjectID(p)}, function(err, pDoc){
//          if(err) return next(err);
//          components.findOne({_id: new ObjectID(l)}, function(err, lDoc){
//            if(err) return next(err);
//
//
//            var pmbuilder = spawn('pmbuilder', ['--input', 'stdin', '-o', path_rendered]);
//
//            pmbuilder.stdin.write(JSON.stringify({context: cDoc, process: pDoc, link: lDoc})+'\n', encoding="utf8");
//            //echo
//            //pmbuilder.stdout.on('data', function (data) {console.log('stdout: ' + data);});
//            //pmbuilder.stderr.on('data', function (data) {console.log('stderr: ' + data);});
//
//            pmbuilder.on('exit', function (code) {
//              if(code === 0) {
//                res.json({ success: 'ready!' })
//              } else {
//                res.json(500, { error: 'FAIL' })
//              }
//            });
//
//          });
//        });
//      });
//    } else {
//      res.json({ success: 'ready!' })
//    }
//
//  });
//}
//
//
//
//
//
//
//exports.trees = function (req, res, next) {
//
//  var _idString = req.query._idString;
//
//  if (_idString){
//    var trees = req.app.get('trees');
//    trees.findOne({_id: new ObjectID(_idString)}, function(err, doc){
//      if(err) return next(err);
//
//      if(doc){
//        res.json(doc);
//      } else {
//        res.json(500, { error: 'could not find tree' })
//      }
//    });
//  } else {
//    res.json(500, { error: 'invalid URL' });
//  }
//
//};
//
//
//exports.components = function (req, res, next) {
//
//  var _idString = req.query._idString;
//
//  if (_idString){
//    var components = req.app.get('components');
//    components.findOne({_id: new ObjectID(_idString)}, function(err, doc){
//      if(err) return next(err);
//
//      if(doc){
//        res.json(doc);
//      } else {
//        res.json(500, { error: 'could not find component' })
//      }
//    });
//  } else {
//    res.json(500, { error: 'invalid URL' });
//  }
//
//};
//
//
//exports.components_post = function (req, res, next) {
//
//  //insert in the db
//  var trees = req.app.get('trees')
//    , components = req.app.get('components');
//  var ptrees =  new PlomTrees(components, trees);
//
//  //from .json file
//  if (req.files && ('component' in req.files)){
//    fs.readFile(req.files.component.path, function (err, data) {
//      var component = JSON.parse(data);
//      ptrees.insertComponentAt(component, req.body.tree_idString, req.body.parent_idString, function(err, doc){
//        res.json(doc);
//      });
//    });
//  } else { //from post
//    ptrees.insertComponentAt(req.body.component, req.body.tree_idString, req.body.parent_idString, function(err, doc){
//      res.json(doc);
//    });
//  }
//
//};
//
//
//
//exports.test = function(req, res){
//    var t = jade.compile(fs.readFileSync('/Users/seb/websites/simforence/simforence-web/sfr-gui//views/test.jade'))();
////    console.log(t);
//    res.send(t);
//};
