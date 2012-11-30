var connect = require('connect')
  , fs = require('fs')
  , path = require('path')
  , http = require('http')
  , spawn = require('child_process').spawn;



//server

var app = connect()
  .use(connect.bodyParser())
  .use(function(req, res){

    console.log(req.body);

    res.end('bye');

  });
http.createServer(app).listen(3000);


//var pmbuilder = spawn('pmbuilder', ['--input', 'stdin', '-o', path.join(odir, 'model'), '--zip'], {cwd: odir});
//pmbuilder.stdin.write(JSON.stringify(model)+'\n', encoding="utf8");
//
//pmbuilder.stdout.on('data', function (data) {console.log('stdout: ' + data);});
////pmbuilder.stderr.on('data', function (data) {console.log('stderr: ' + data);});
//
//pmbuilder.on('exit', function (code) {
//  console.log('child process exited with code ' + code);
//
//  if(code === 0) {
//    console.log('sending the model');
//  }
//
//});
