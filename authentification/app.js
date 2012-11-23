var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , mongodb = require('mongodb')
  , bcrypt = require('bcrypt');

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


app.get('/', secure, routes.index);
app.get('/login', csrf, user.login);
app.get('/success', function(req, res, next){res.send("authenticated");});
app.get('/logout', user.logout);
app.get('/register', csrf, user.register);

app.post('/login', csrf, user.login_post);
app.post('/register', csrf, user.register_post);

var server = http.createServer(app);

var db = exports.db = new mongodb.Db('plom', new mongodb.Server("127.0.0.1", 27017), {safe:true});
db.open(function (err, client) {

  if (err) throw err;
  console.log("Connected to mongodb");

  //store ref to the collection so that it is easily accessible (app is accessible in req and res!)
  app.set('users',  new mongodb.Collection(client, 'users'));

  server.listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
  });

});
