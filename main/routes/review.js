var fs = require('fs')
  , async = require('async')
  , check = require('validator').check
  , mongodb = require('mongodb')
  , ObjectID = require('mongodb').ObjectID
  , writePredictFiles = require('../lib/predict')
  , ppriors = require('plom-priors')
  , xreview = require('../lib/review')
  , path = require('path');


exports.index = function(req, res, next){

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

    components.find({_id: {$in: comps.link.theta_id}}).toArray(function(err, thetas){
      if (err) return next(err);

      comps.thetas = thetas;
      comps.infectors = ppriors.tooltipify(comps);
      comps.link.prior = ppriors.display(comps.link.prior, comps);

      comps.thetas = comps.thetas.map(function(theta){
        ppriors.getCaptions(comps, theta);
        return theta;
      });

      comps.theta = thetas[0];

      res.format({
        html: function(){
          xreview.get(req.app.get('reviews'), undefined, comps, function(err, reviews){            
            comps.reviews = reviews;
            res.render('review/index', comps);            
          });
        },

        json: function(){

          //send the templates TODO browserify...
          async.parallel({ 
            control: function(cb) {fs.readFile(path.join(req.app.get('views'),'review', 'tpl','control.ejs'), 'utf8', cb)},
            cred: function(cb) {fs.readFile(path.join(req.app.get('views'),'review', 'tpl','cred.ejs'), 'utf8', cb)},
            summaryTable: function(cb) {fs.readFile(path.join(req.app.get('views'),'review', 'tpl','summary_table.ejs'), 'utf8', cb)},
            ticks: function(cb) {fs.readFile(path.join(req.app.get('views'),'review', 'tpl','ticks.ejs'), 'utf8', cb)},
            reviewer: function(cb) {fs.readFile(path.join(req.app.get('views'),'review', 'tpl','reviewer.ejs'), 'utf8', cb)},
            discuss: function(cb) {fs.readFile(path.join(req.app.get('views'),'review', 'tpl','discuss.ejs'), 'utf8', cb)},
          }, function(err, tpl){
            if(err) return next(err);

            for(var key in tpl){
              tpl[key] = tpl[key].replace(/<%= token %>/g, req.session._csrf);
            }
            
            res.json({tpl:tpl, comps: comps});                             
          });
        }

      });      

    });

  });
};


exports.post = function(req, res, next){

  var review = req.body;

  xreview.post(req.app.get('reviews'), req.app.get('events'), review, req.session.username, function(err, reviews){
    res.send({reviews:reviews, username:req.session.username});
  });

}





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


exports.theta = function(req, res, next){

  var r = req.app.get('reviews');

  r.find({theta_id: req.params.theta_id}).sort({_id: 1}).toArray(function(err, reviews){
    if(err) return next(err);
    res.send({reviews: reviews, username: req.session.username});
  });

};



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


exports.postTheta = function(req, res, next){

  var r = req.app.get('reviews');
  var review = req.body;
  delete review._csrf;

  review.username = req.session.username;
  review.date = new Date();

  r.insert(review, function(err, review){
    if(err) return next(err);

    //add event
    var mye = {
      from: req.session.username,
      type: 'review',
      name: review[0].name,
      option: review[0].decision,
      review_id: review[0]._id,
      context_id: review[0].context_id,
      process_id: review[0].process_id,
      link_id: review[0].link_id,
      theta_id: review[0].theta_id
    };

    var e = req.app.get('events');
    e.insert(mye, function(err, docs){
      if(err) return next(err);
    });

    r.find({theta_id: review[0].theta_id}).sort({_id: 1}).toArray(function(err, reviews){
      if(err) return next(err);
      res.send({reviews: reviews, username: req.session.username});
    });

  });

};




exports.postCommentTheta = function(req, res, next){

  var r = req.app.get('reviews');
  var comment = req.body;

  var _id = new ObjectID(comment.review_id);
  delete comment.review_id;
  delete comment._csrf;

  comment.username = req.session.username;
  comment.date = new Date();

  var update = {$push: {comments: comment}};
  if(comment.change){
    update['$set'] = {decision: comment.change};
  }

  r.findAndModify({_id:_id},[], update, {safe:true, 'new':true}, function(err, review){
    if(err) return next(err);

    //add event
    var mye = {
      from: req.session.username,
      type: 'review',
      option: (comment.change) ? 'revised_': ((comment.decision) ? 'contested_' + comment.decision : 'commented'),
      review_id: review._id,
      comment_id: review.comments.length-1,
      context_id: review.context_id,
      process_id: review.process_id,
      link_id: review.link_id,
      theta_id: review.theta_id,
      user_id: review.username,
      name: review.name
    };

    var e = req.app.get('events');
    e.insert(mye, function(err, docs){
      if(err) return next(err);
    });

    r.find({theta_id: review.theta_id}).sort({_id: 1}).toArray(function(err, reviews){
      if(err) return next(err);
      res.send({reviews: reviews, username: req.session.username});
    });

  });

};


exports.postDiscuss = function(req, res, next){

  var type = req.params.type;

  var c = req.app.get('components');
  var d = req.body;
  delete d._csrf;

  d.username = req.session.username;
  d.date = new Date();

  var pg; //parameter and group if type === prior

  var upd = {$push:{}};

  if(type === 'pmodel'){
    upd['$push']['process_model.' + d.discussion_id + '.discussion'] = d;
  } else if (type === 'omodel'){
    upd['$push']['observed.' + d.discussion_id + '.discussion'] = d;
  } else {
    pg = d.discussion_id.split(':');
    upd['$push']['parameter.' + pg[0] + '.group.' + pg[1] + '.prior.discussion'] = d;
  }

  console.log(upd);

  c.findAndModify({_id: new ObjectID(d.theta_id || d.link_id)}, [], upd, {safe:true, 'new':true}, function(err, doc) {
    if (err) return next(err);

    //add event
    var mye = {
      from: req.session.username,
      type: 'discuss_' + type,
      name: d.name,
      discussion_id: d.discussion_id,
      context_id: d.context_id,
      process_id: d.process_id,
      link_id: d.link_id
    };

    if(type === 'prior'){
      mye.theta_id = d.theta_id;
    }

    var e = req.app.get('events');
    e.insert(mye, function(err, docs){
      if(err) return next(err);
    });


    if(type === 'pmodel'){
      res.send(doc.process_model[d.discussion_id].discussion);
    } else if (type === 'omodel'){
      res.send(doc.observed[d.discussion_id].discussion);
    } else {
      console.log(doc.parameter[pg[0]].group[pg[1]].prior);
      res.send(doc.parameter[pg[0]].group[pg[1]].prior.discussion);
    }

  });

};
