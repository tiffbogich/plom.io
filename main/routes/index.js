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
  , Grid = require('gridfs-stream')
  , zlib = require("zlib")
  , csv = require("csv")
  , writePredictFiles = require('../lib/predict')
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
                         var u = req.app.get('users');
                         u.findOne({_id: req.session.username}, function(err, user){
                           if (err) return next(err);
                           res.render('index', {ctree:ctree, context_followed: user.context_id || []});
                         });
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

  if(!(c && p && l)){
    return res.redirect('/library');
  }

  var components = req.app.get('components');

  components.find({_id: {$in: [c, p, l].map(function(x){return new ObjectID(x);})}}).toArray(function(err, docs){
    if (err) return next(err);

    var comps = {};
    docs.forEach(function(x){
      comps[x.type] = x;
    });

    res.format({
      html: function(){
        res.render('review/index', {
          context: comps.context,
          process: comps.process,
          link: comps.link,
        });
      },

      json: function(){
        components
          .find({_id: {$in: comps.link.theta_id}})
          .toArray(function(err, thetas){
            if (err) return next(err);

            comps.thetas = thetas.map(function(theta){
              return describeTheta(theta, comps.process, comps.link);
            });

            res.json({
              tpl:{ //TODO browserify...
                control: fs.readFileSync(path.join(req.app.get('views'),'review', 'tpl','control.ejs'), 'utf8'),
                summaryTable: fs.readFileSync(path.join(req.app.get('views'),'review', 'tpl','summary_table.ejs'), 'utf8'),
                parameters: fs.readFileSync(path.join(req.app.get('views'),'review', 'tpl','parameters.ejs'), 'utf8'),
                ticks: fs.readFileSync(path.join(req.app.get('views'),'review', 'tpl','ticks.ejs'), 'utf8'),
                reviews: fs.readFileSync(path.join(req.app.get('views'),'review', 'tpl','reviews.ejs'), 'utf8').replace(/<%= token %>/g, req.session._csrf),
                model: fs.readFileSync(path.join(req.app.get('views'),'review', 'tpl','model.ejs'), 'utf8').replace(/<%= token %>/g, req.session._csrf),
                discuss: fs.readFileSync(path.join(req.app.get('views'),'review', 'tpl','discuss.ejs'), 'utf8').replace(/<%= token %>/g, req.session._csrf)
              },
              comps: comps
            });
          });
      }
    });
  });
};


exports.diagnosticSummary = function(req, res, next){
  var theta_id = req.params.theta_id
    , diagnostics = req.app.get('diagnostics');

  diagnostics.find({theta_id: theta_id}, {summary:true, h:true}).sort({'summary.essMin':-1}).toArray(function(err, docs){
    res.send(docs);
  });

}


exports.diagnosticDetail = function(req, res, next){
  var theta_id = req.params.theta_id
    , h = parseInt(req.params.h, 10)
    , diagnostics = req.app.get('diagnostics');

  diagnostics.findOne({theta_id: theta_id, h:h}, {detail:true, X:true}, function(err, doc){
    res.send(doc);
  });
}


exports.forecast = function(req, res, next){
  var link_id = req.params.link_id
    , theta_id = req.params.theta_id
    , h = parseInt(req.params.h, 10);

  var predictPath = path.join(process.env.HOME, 'built_plom_models', link_id, 'model', theta_id);
  fs.exists(predictPath, function (exists) {

    if(exists){
      res.send({ready:true});
    } else {
      var db = req.app.get('db');
      var gfs = Grid(db, mongodb);

      gfs.files.find({ 'metadata.theta_id': new ObjectID(theta_id), 'metadata.type': {$in: ['best', 'X']}, 'metadata.h':h }, {_id:true, metadata:true}).toArray(function (err, files) {
        if (err) return callback(err);
       
        writePredictFiles(gfs, predictPath, files, function(err){
          if (err) return next(err);

          //add theta
          var components = req.app.get('components');
          components.findOne({_id: new ObjectID(theta_id)}, {results:true}, function(err, theta){
            if (err) return next(err);

            theta = theta.results.filter(function(x){return x.trace_id === h})[0].theta;
            fs.writeFile(path.join(predictPath, 'theta_'+ h +'.json'), JSON.stringify(theta), function(err){
              if (err) return next(err);
              res.send({ready:true});
            });
            
          });
        })
      }); //end toArray
    } //end else

  }); //end fs.exists

}

//exports.test = function(req, res){
//    var t = jade.compile(fs.readFileSync('/Users/seb/websites/simforence/simforence-web/sfr-gui//views/test.jade'))();
////    console.log(t);
//    res.send(t);
//};
