/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , fs = require('fs')
  , http = require('http')
  , mongodb = require('mongodb')
  , sfrWsServer = require('../ws-server/plomWsServer')
  , plomAuth = require('../authentification/app')
  , csrf = require('../authentification/lib/middleware').csrf
  , is_logged_in = require('../authentification/lib/middleware').is_logged_in
  , secure = require('../authentification/lib/middleware').secure;


var app = express();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());

  app.use(express.cookieParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'my secret'}));

  app.use(is_logged_in);
  app.use(app.router);

  app.use(express.static(__dirname + '/public'));

  //documentation website
  app.use(require('../doc/app'));

  //authentification
  app.use(plomAuth);

});


app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});


app.configure('production', function(){
  app.use(express.errorHandler());
});


//var settingsJSON = require('./lib/middleware/settingsJSON');

// Routes

app.get('/', routes.index);
app.get('/play', secure, routes.play);
app.get('/library', secure, routes.library);
app.get('/process', routes.process);
app.get('/tree', routes.tree);


//app.get('/test', routes.test);


var server = http.createServer(app);
var db = new mongodb.Db('plom', new mongodb.Server("127.0.0.1", 27017), {safe:true});
db.open(function (err, client) {

  if (err) throw err;
  console.log("Connected to mongodb");

  //store ref to the collection so that it is easily accessible (app is accessible in req and res!)
  app.set('users',  new mongodb.Collection(client, 'users'));

  server.listen(3000, function(){
    console.log("Express server listening on port %d in %s mode", server.address().port, app.settings.env);
  });

  //attach socket.io
  sfrWsServer.listen(server);

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
