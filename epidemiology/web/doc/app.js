/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , routes = require('./routes');

var app = express();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'my secret'}));
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes
app.get('/doc', routes.index);
app.get('/doc/modeler/intro', routes.modeler.intro);
app.get('/doc/modeler/create', routes.modeler.create);
app.get('/doc/modeler/play', routes.modeler.play);
app.get('/doc/modeler/hfmd', routes.modeler.hfmd);
app.get('/doc/modeler/h1n1', routes.modeler.h1n1);


module.exports = http.createServer(app);
