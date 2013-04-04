var app  = require('./app')
  , routes = require('./routes')
  , http = require('http')
  , mongodb = require('mongodb');

var secure = require('./lib/middleware').secure;

app.get('/', secure, routes.index);

var server = http.createServer(app);

var MongoClient = mongodb.MongoClient;

MongoClient.connect("mongodb://localhost:27017/plom", function(err, db) {

  if (err) throw err;
  console.log("Connected to mongodb");

  //store ref to the collection so that it is easily accessible (app is accessible in req and res!)
  app.set('users',  new mongodb.Collection(db, 'users'));

  server.listen(3000, function(){
    console.log("Express server listening on port %d", server.address().port);
  });

});
