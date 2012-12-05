// Listen

var app  = require('./app')
  , http = requre('http');

var server = http.createServer(app);
server.listen(3000, function(){
  console.log("Express server listening on port %d", server.address().port);
});
