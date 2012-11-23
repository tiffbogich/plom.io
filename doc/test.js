// Listen
var server  = require('./app');
server.listen(3000, function(){
  console.log("Express server listening on port %d", server.address().port);
});
