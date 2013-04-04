var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , path = require('path');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
  app.use(express.csrf());
  app.use(require('./lib/middleware').is_logged_in);

  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});


//import custom middleware
var csrf = require('./lib/middleware').csrf
  , secure = require('./lib/middleware').secure;

app.get('/login', csrf, user.login);
app.get('/success', function(req, res, next){res.send("authenticated");});
app.get('/logout', user.logout);
app.get('/register', csrf, user.register);

app.post('/login', csrf, user.login_post);
app.post('/register', csrf, user.register_post);

module.exports = app;
