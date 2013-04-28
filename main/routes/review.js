var fs = require('fs')
  , async = require('async')
  , querystring = require('querystring')
  , check = require('validator').check
  , mongodb = require('mongodb')
  , ObjectID = require('mongodb').ObjectID
  , Grid = require('gridfs-stream')
  , writePredictFiles = require('../lib/predict')
  , ppriors = require('plom-priors')
  , xreview = require('../lib/review')
  , path = require('path');

exports.index = function(req, res, next){

  var c = req.session.context_id
    , p = req.session.process_id
    , l = req.session.link_id;

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

    //store names and disease in session
    req.session.disease = comps.context.disease;
    req.session.context_name = comps.context.name;
    req.session.process_name = comps.process.name;
    req.session.link_name = comps.link.name;

    components.find({_id: {$in: comps.link.theta_id}}).toArray(function(err, thetas){
      if (err) return next(err);

      //sort by DIC
      thetas.sort(function(a, b){return a.dic - b.dic;});      
      //we need the posteriors:
      //get the best result object (containing theta and the posteriors)

      var best = thetas[0].result.filter(function(x){return x.trace_id === thetas[0].trace_id;})[0];
      best.theta._id = thetas[0]._id;
      best.theta.trace_id = thetas[0].trace_id;

      comps.thetas = thetas;
      comps.best = best;

      res.format({
        html: function(){
          //add the reviews to comps
          xreview.stats(req.app.get('reviews'), comps, function(err, comps_reviewed){
            if(err) return next(err);
            
            //tooltipify
            comps.infectors = ppriors.tooltipify(comps);
            comps.link.prior = ppriors.display(comps.link.prior, comps);
            comps.best.posterior = ppriors.display(comps.best.posterior, comps);

            //querystrings
            comps.dquery = querystring.stringify({d:comps.context.disease});
            comps.cquery = querystring.stringify({d:comps.context.disease, c:comps.context.name});

            res.render('review/index', comps);
          });
        },
        json: function(){

          //send the templates TODO browserify...
          async.parallel({ 
            control: function(cb) {fs.readFile(path.join(req.app.get('views'),'review', 'tpl','control.ejs'), 'utf8', cb)},
            cred: function(cb) {fs.readFile(path.join(req.app.get('views'),'review', 'tpl','cred.ejs'), 'utf8', cb)},
            summaryCoda: function(cb) {fs.readFile(path.join(req.app.get('views'),'review', 'tpl','summary_coda.ejs'), 'utf8', cb)},
            ticks: function(cb) {fs.readFile(path.join(req.app.get('views'),'review', 'tpl','ticks.ejs'), 'utf8', cb)},
            reviewer: function(cb) {fs.readFile(path.join(req.app.get('views'),'review', 'tpl','reviewer.ejs'), 'utf8', cb)}
          }, function(err, tpl){
            if(err) return next(err);

            for(var key in tpl){
              tpl[key] = tpl[key].replace(/<%= token %>/g, req.session._csrf);
            }

            var result = comps.best;
            result.posterior = ppriors.display(result.posterior, comps);
            res.send({
              model: {
                context: comps.context,
                process: comps.process, 
                link: comps.link, 
                result: result,  //the best theta (used for forecasting)
                thetas: comps.thetas.map(function(x){return {theta_id: x._id, trace_id: x.trace_id};}) //sorted theta_id, trace_id (used to make ajax call)
              },
              tpl:tpl
            });

          });

        }
      });

    });
  });
};


exports.post = function(req, res, next){

  var review = req.body;

  xreview.post(req.app.get('reviews'), req.app.get('events'), req.session, review , function(err, reviews){
    res.send({reviews:reviews, username:req.session.username});
  });
}

exports.comment = function(req, res, next){

  var comment = req.body;

  xreview.comment(req.app.get('reviews'), req.app.get('events'), req.session, comment, function(err, reviews){
    res.send({reviews:reviews, username:req.session.username});
  });
}


exports.get = function(req, res, next){

  xreview.get(req.app.get('reviews'), req.session, req.params, function(err, reviews){
    if(err) return next(err);    
    res.send({reviews: reviews, username: req.session.username});
  });

};


exports.diagnosticSummary = function(req, res, next){
  var theta_id = req.params.theta_id
    , diagnostics = req.app.get('diagnostics');

  diagnostics.find({theta_id: theta_id}, {summary:true, trace_id:true, theta_id:true}).sort({'summary.essMin':-1}).toArray(function(err, docs){
    res.send(docs);
  });

}

exports.diagnosticDetail = function(req, res, next){
  var theta_id = req.params.theta_id
    , trace_id = parseInt(req.params.trace_id, 10)
    , diagnostics = req.app.get('diagnostics');

  diagnostics.findOne({theta_id: theta_id, trace_id: trace_id}, {detail:true, X:true}, function(err, doc){
    res.send(doc);
  });
}


exports.forecast = function(req, res, next){
  var link_id = req.params.link_id
    , theta_id = req.params.theta_id
    , trace_id = parseInt(req.params.trace_id, 10);

  var predictPath = path.join(process.env.HOME, 'built_plom_models', link_id, 'model', theta_id);
  fs.exists(predictPath, function (exists) {

    if(exists){
      res.send({ready:true});
    } else {
      var db = req.app.get('db');
      var gfs = Grid(db, mongodb);

      gfs.files.find({ 'metadata.theta_id': new ObjectID(theta_id), 'metadata.type': {$in: ['best', 'X']}, 'metadata.trace_id':trace_id }, {_id:true, metadata:true}).toArray(function (err, files) {
        if (err) return callback(err);
       
        writePredictFiles(gfs, predictPath, files, function(err){
          if (err) return next(err);

          //add theta
          var components = req.app.get('components');
          components.findOne({_id: new ObjectID(theta_id)}, {result: true}, function(err, theta){
            if (err) return next(err);

            theta = theta.result.filter(function(x){return x.trace_id === trace_id})[0].theta;
            fs.writeFile(path.join(predictPath, 'theta_'+ trace_id +'.json'), JSON.stringify(theta), function(err){
              if (err) return next(err);
              res.send({ready:true});
            });
            
          });
        })
      }); //end toArray
    } //end else

  }); //end fs.exists

}




exports.vizbit = function(req, res, next){

  var projection = {vizbit:true, comments: true, _id:false};

  if(typeof req.params.comment_id !== 'undefined'){
    projection.comments = {'$slice': [req.params.comment_id, 1]};
  }

  var r = req.app.get('reviews');
  r.findOne({_id: new ObjectID(req.params.review_id)}, projection, function(err, doc){
    if(err) return next(err);

    if(typeof req.params.comment_id !== 'undefined'){
      res.json(doc.comments[0].vizbit);
    } else {
      res.json(doc.vizbit);
    }

  });

};

