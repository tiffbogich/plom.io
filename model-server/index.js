var connect = require('connect')
  , http = require('http')
  , fs = require('fs')
  , path = require('path')
  , spawn = require('child_process').spawn;

var app = connect()
  .use(connect.bodyParser())
  .use(function(req, res){

    var model = req.body;

    var pmbuilder = spawn('pmbuilder', ['--input', 'stdin', '-o', 'my_model', '--zip']); //{cwd: xxx}
    pmbuilder.stdin.write(JSON.stringify(model)+'\n', encoding="utf8");
    //echo
    //pmbuilder.stdout.on('data', function (data) {console.log('stdout: ' + data);});
    //pmbuilder.stderr.on('data', function (data) {console.log('stderr: ' + data);});

    pmbuilder.on('exit', function (code) {

      if(code === 0) {
        //we want the content-length to use a progress bar so we use stat...
        fs.stat('my_model.tar.gz', function(err, stats){
          res.writeHead(200, {'Content-Type': 'application/x-gzip',
                              'Content-Length': stats.size});

          fs.createReadStream('my_model.tar.gz').pipe(res);
        });

      } else {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('\033[91m' + 'FAIL' + '\033[0m' + ': something went wrong\n');
      }

    });

  });

http.createServer(app).listen(3000);
