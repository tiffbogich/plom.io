/**
 * Module dependencies.
 */

var express = require('express')
, routes = require('./routes')
, fs = require('fs')
, http = require('http')
, sfrWsServer = require('../ws-server/plomWsServer');

var app = express();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'my secret'}));
  app.use(express.static(__dirname + '/public'));

  //documentation website
  app.use(require('../doc/app'));
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
app.get('/play', routes.play);
app.get('/library', routes.library);
app.get('/process', routes.process);
app.get('/tree', routes.tree);


//app.get('/test', routes.test);


// Listen
var server  = module.exports = http.createServer(app);
server.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", server.address().port, app.settings.env);
});

//attach socket.io
sfrWsServer.listen(server);



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
