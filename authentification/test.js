var app  = require('./app')
  , http = require('http')
  , mongodb = require('mongodb');


var server = http.createServer(app);

var db = exports.db = new mongodb.Db('plom', new mongodb.Server("127.0.0.1", 27017), {safe:true});
db.open(function (err, client) {

  if (err) throw err;
  console.log("Connected to mongodb");

  //store ref to the collection so that it is easily accessible (app is accessible in req and res!)
  app.set('users',  new mongodb.Collection(client, 'users'));

  server.listen(3000, function(){
    console.log("Express server listening on port %d", server.address().port);
  });

});
