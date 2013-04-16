/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , review = require('./routes/review')
  , user = require('./routes/user')
  , fs = require('fs')
  , path = require('path')
  , http = require('http')
  , mongodb = require('mongodb')
  , plomWsServer = require('../ws-server')
  , plomAuth = require('../authentification/app')
  , csrf = require('../authentification/lib/middleware').csrf
  , is_logged_in = require('../authentification/lib/middleware').is_logged_in
  , secure = require('../authentification/lib/middleware').secure;

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

});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});


app.configure('production', function(){
  app.use(express.errorHandler());
});


//var settingsJSON = require('./lib/middleware/settingsJSON');

// Routes

app.get('/', csrf, routes.welcome);
app.get('/about', routes.about);

app.get('/library', secure, csrf, routes.index);
app.post('/library', secure, csrf, routes.postIndex);
app.post('/fork', csrf, routes.postFork);

app.get('/review', secure, csrf, routes.review);
app.get('/trace/:_id', secure, routes.trace);
app.get('/diagnostic/:theta_id', secure, routes.diagnosticSummary);
app.get('/diagnostic/:theta_id/:h', secure, routes.diagnosticDetail);

//review page
app.get('/reviewstheta/:theta_id', secure, review.theta);
app.post('/reviewtheta', secure, csrf, review.postTheta);
app.post('/commentreviewtheta', secure, csrf, review.postCommentTheta);
app.get('/vizbit/:review_id/:comment_id?', review.vizbit);

//discussion
app.post('/discuss/:type', secure, csrf, review.postDiscuss);


//social network
app.post('/followcontext', secure, csrf, user.postFollow);
app.post('/followuser', secure, csrf, user.postFollow);
app.get('/:username', csrf, user.user);




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
  app.set('reviews',  new mongodb.Collection(db, 'reviews'));
  app.set('diagnostics',  new mongodb.Collection(db, 'diagnostics'));
  app.set('pngs',  new mongodb.Collection(db, 'pngs'));

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
