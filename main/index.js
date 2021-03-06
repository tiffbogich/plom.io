/**
 * Module dependencies.
 */

var express = require('express')
  , ejs = require('ejs')
  , filters = require('./lib/filters')
  , routes = require('./routes')
  , context = require('./routes/context')
  , model = require('./routes/model')
  , review = require('./routes/review')
  , requests = require('./routes/requests')
  , user = require('./routes/user')
  , fs = require('fs')
  , path = require('path')
  , http = require('http')
  , mongodb = require('mongodb')
  , plomWsServer = require('../ws-server')
  , plomAuth = require('../authentification/app')
  , csrf = require('../authentification/lib/middleware').csrf
  , is_logged_in = require('../authentification/lib/middleware').is_logged_in
  , secure = require('../authentification/lib/middleware').secure
  , exposeReqParams = require('./lib/middleware').exposeReqParams;


//add custom ejs filters
filters.add(ejs);

var app = express();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());

  app.use(express.cookieParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'my secret'}));

  app.use(express.csrf());
  app.use(is_logged_in);

  app.use(express.static(__dirname + '/public'));

  //documentation website
  app.use(require('../doc/app'));

  //authentification (/login, /logout, /register)
  app.use(plomAuth);

  app.use(app.router);

  app.use(function(req, res, next){

    res.status(404);

    if (req.accepts('html')) {
      res.render('404', { url: req.url });
      return;
    }

    if (req.accepts('json')) {
      res.send({ error: 'Not found' });
      return;
    }

    res.type('txt').send('Not found');
  });

  app.use(function(err, req, res, next){
    res.status(err.status || 500);
    res.render('500', { error: err });
  });


});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});


app.configure('production', function(){
  app.use(express.errorHandler());
});


//var settingsJSON = require('./lib/middleware/settingsJSON');


app.get('/template/context', secure, csrf, context.index);
app.post('/upload/context', secure, csrf, context.upload);
app.post('/commit/context', secure, csrf, context.commit);

app.get('/template/model', secure, csrf, model.index);



// Routes
app.get('/', csrf, routes.welcome);
app.get('/about', routes.about);

//index page
app.get('/library', secure, csrf, routes.index);
app.post('/search', secure, csrf, routes.index);
app.post('/library', secure, csrf, routes.build);
app.post('/fork/model', csrf, routes.postFork);
//app.post('/fork/context', csrf, routes.postFork);

//review page
app.get('/review/:link_id?', secure, csrf, review.index); //returns a social model (i.e with everything reviewed)
app.post('/review', secure, csrf, review.post); //post review
app.post('/comment', secure, csrf, review.comment); //post comment to a review

app.get('/review/:type/:id', secure, csrf, review.get);  //get specific reviews (AJAX)
app.get('/diagnostic/:theta_id', secure, review.diagnosticSummary); 
app.get('/diagnostic/:theta_id/:trace_id', secure, review.diagnosticDetail);
app.get('/forecast/:link_id/:theta_id/:trace_id', secure, review.forecast);
app.get('/vizbit/:review_id/:comment_id?', review.vizbit);

//general
app.get('/component/:_id/:id?', secure, routes.component); //components (for AJAX call)


//request
app.get('/requests/threads/:type?', secure, csrf, requests.get);
app.get('/requests/:context_id', secure, csrf, requests.index);
app.post('/requests', secure, csrf, requests.post);
app.post('/resolve', secure, csrf, requests.resolve);

//social network
app.post('/follow/:what', secure, csrf, user.postFollow);
app.get('/:username', secure, csrf, exposeReqParams, user.user);




//makes sure that necessary directories exist
var buildPath = path.join(process.env.HOME, 'built_plom_models')
  , downloadPath = path.join(process.env.HOME, 'download_plom_models');

if(!fs.existsSync(buildPath)){
  fs.mkdirSync(buildPath);
}
if(!fs.existsSync(downloadPath)){
  fs.mkdirSync(downloadPath);
}

var server = http.createServer(app);
var MongoClient = mongodb.MongoClient;

MongoClient.connect("mongodb://localhost:27017/plom", function(err, db) {

  if (err) throw err;
  console.log("Connected to mongodb");

  //store ref to the collections so that it is easily accessible (app is accessible in req and res!)
  app.set('db', db);
  app.set('users',  new mongodb.Collection(db, 'users'));
  app.set('events',  new mongodb.Collection(db, 'events'));
  app.set('components',  new mongodb.Collection(db, 'components'));
  app.set('priors',  new mongodb.Collection(db, 'priors'));
  app.set('reviews',  new mongodb.Collection(db, 'reviews'));
  app.set('requests',  new mongodb.Collection(db, 'requests'));
  app.set('diagnostics',  new mongodb.Collection(db, 'diagnostics'));

  //TODO ensureIndex

  server.listen(3000, function(){
    console.log("Express server listening on port %d in %s mode", server.address().port, app.settings.env);
  });

  //attach socket.io
  plomWsServer.listen(server);

});



if(0){
  var numCPUs = require('os').cpus().length
  , cluster = require('cluster');
  numCPUs=1;

  if (cluster.isMaster) {
    // Fork workers.
    for (var i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    cluster.on('exit', function(worker, code, signal) {
      console.log('worker ' + worker.process.pid + ' died');
    });

    cluster.on('online', function(worker) {
      console.log("Yay, the worker" + worker.process.pid +" responded after it was forked");
    });

    cluster.on('exit', function(worker, code, signal) {
      var exitCode = worker.process.exitCode;
      console.log('worker ' + worker.process.pid + ' died ('+exitCode+'). restarting...');
      cluster.fork();
    });

  } else {

    var server = http.createServer(app);
    server.listen(3000, function(){
      console.log("Express server listening on port %d in %s mode", server.address().port, app.settings.env);
    });

    //attach socket.io
    sfrWsServer.listen(server);
  }
}
