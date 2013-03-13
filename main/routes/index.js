var fs = require('fs')
  , describeTheta = require('../lib/helper').describeTheta
  , PlomTrees = require('../../db').PlomTrees
  , check = require('validator').check
  , mongodb = require('mongodb')
  , spawn = require('child_process').spawn
  , ObjectID = require('mongodb').ObjectID
  , path = require('path')
  , async = require('async')
  , _ = require('underscore')
  , dbUtil = require('../../db-utils');

exports.index = function(req, res){

  res.format({
    json: function(){
      
      var components = req.app.get('components');

      var q = (req.body.q) ? dbUtil.querify(req.body.q, req.body.d) : {type: 'link'};

      components.find(q, {context_id:1, process_id:1, theta_id:1, _id:0}).toArray(function(err, links){
        if (err) return next(err);
        
        async.parallel({
          context: function(callback){
            components
              .find({_id: {$in: _.uniq(links.map(function(x){return x.context_id;}))}},
                    {name:1, description:1, data:1})
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
              .find({_id: {$in: _.uniq(links.map(function(x){return x.theta_id;})) }, status:'best'})
              .toArray(function(err, t){
                if (err) callback(err);
                
                callback(null, t);

              });
          }
        }, 
                       function(err, results) {
                         if (err) return next(err);

                         //make a context tree (ctree)
                         var ctree = results.context;
                         ctree.forEach(function(c, i){
                           
                           //attach process
                           c['process'] = results.process.filter(function(p){

                             var my_process_id = links
                               .filter(function(x){return x.context_id.equals(c._id)})
                               .map(function(x){return x.process_id});

                             return my_process_id.some(function(x) {return x.equals(p._id)});
                           });

                           //attach theta to each process
                           c['process'].forEach(function(p){

                             var my_theta_id = links
                               .filter(function(x){return ( (x.context_id === c._id) && (x.process_id = p._id))})
                               .map(function(x){return x.theta_id});

                             my_theta_id = _.uniq(_.flatten(my_theta_id));
                             
                             
                             p['theta'] = results.theta.filter(function(x){ 
                               return my_theta_id.some(function(y) {return y.equals(p._id)});
                             });

                           });

                         });
                         res.send(ctree);
                       });
      });
    },
    html: function(){
      res.render('index');
    }
  });

};





exports.trace = function(req, res, next){ 

  var diag = req.app.get('diag');
  //_id: new ObjectId(req.params._id)

  diag.findOne({}, function(err, doc){        
    res.set('Content-Type', doc["content-type"]);
    res.end(doc.data.buffer);
  });
  
}




















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
