var fs = require('fs')
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
  , ppriors = require('plom-priors')
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

  //first let's get the matching contexts. The results can be large so we just get the context_id
  components.find(q, {context_id:true}).toArray(function(err, links_context_id){
    if (err) return next(err);

    var contexts_id = _.uniq(links_context_id.map(function(x){return x.context_id;}));
    //TODO pagination (restrict to a subset of context)...

    //we have 5 context_id, let's retrieve everything for them...
    //first the links involved in contexts_id
    components.find({type:'link', context_id: {$in: contexts_id}}).toArray(function(err, links){

      //everything that belongs to these links..
      async.parallel({
        context: function(callback){
          //do no retrieve data (will be ajax requested)
          components
            .find({_id: {$in: _.uniq(links.map(function(x){return x.context_id;}))}}, {data:false})
            .toArray(callback);
        },
        process: function(callback){
          components
            .find({_id: {$in: _.uniq(links.map(function(x){return x.process_id;})) }})
            .toArray(callback);
        },
        theta: function(callback){
          components
            .find({_id: {$in: _.uniq(_.flatten(links.map(function(x){return x.theta_id;}))) }})
            .toArray(callback);
        },
        related: function(callback){
          //all the links related to the process model of the links matching our query
          components
            .find({type: 'link', process_id: {$in: _.uniq(links.map(function(x){return x.process_id;}))}}, {context_disease:1, process_id:1})
            .toArray(callback);
        },

      }, function(err, results) {

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

            //the result with the smallest DIC
            var my_result = undefined;

            var my_thetas = link.theta_id
              .filter(function(x){return x in obj})
              .map(function(x){return obj[x];});


            if(my_thetas.length){
              var my_dic = Math.min.apply(Math, my_thetas.map(function(x){return x.dic;}));
              var best_theta = my_thetas.filter(function(x){return x.dic === my_dic;})[0];
              //replace by the result maximising the loglikelihood
              my_result = best_theta.result.filter(function(x){return x.trace_id === best_theta.trace_id;})[0];
              my_result.theta._id = best_theta._id;
            }
            
            var model = {
              process: obj[link.process_id],
              link: link,
              theta: my_result &&  my_result.theta,
              posterior: my_result && my_result.posterior
            }

            if(model.posterior){
              model.posterior = ppriors.display(model.posterior, model);
            }
            c.model.push(model);
          });

          //sort model by DIC
          c.model.sort(function(a, b){
            if('theta' in a && 'theta' in b){
              return a.theta.dic - b.theta.dic;
            } else {
              return 1;
            }
          });

        });

        var u = req.app.get('users');
        u.findOne({_id: req.session.username}, function(err, user){
          if (err) return next(err);
          res.render('index/index', {ctree:ctree, context_followed: user.context_id || []});
        });

      });
    });
  });
};



/**
 * POST request: Build model (if needed) and redirect to review
 */
exports.build = function(req, res, next){

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



exports.component = function(req, res, next){
  var _id = new ObjectID(req.params._id);
  var components = req.app.get('components');

  components.findOne({_id:_id}, function(err, doc){    
    if(err) return next(err);

    if(doc.type === 'context'){
      //keep only the data as opposed to the meta data
      var data = doc.data.filter(function(d){return d.id ==='data'})[0];
      doc.data = data.source.slice(1); //remove header;
    }
    res.send(doc);
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



//exports.test = function(req, res){
//    var t = jade.compile(fs.readFileSync('/Users/seb/websites/simforence/simforence-web/sfr-gui//views/test.jade'))();
////    console.log(t);
//    res.send(t);
//};
