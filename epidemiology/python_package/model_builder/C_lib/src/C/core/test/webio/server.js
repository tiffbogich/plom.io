var MODELS_PATH = __dirname;

var express = require("express"),
app = require('express').createServer(),
io = require('socket.io').listen(app),
fs = require('fs');

io.set('log level', 0); //shut the f* up

//serve static content
app.use(express.static(__dirname + '/static'));

app.listen(8000);

//serve main page...
app.get('/', function (req, res) {
    res.sendfile(__dirname + '/index.html');
});


////serve the json data
//app.get('/data', function(req, res) {
//    res.writeHead(200, {'content-type': 'text/json' });
//    fs.readFile(__dirname + '/data/ecoli_settings.json', 'utf8', function (err,data) {
//	if (err) {
//	    return console.log(err);
//	}
//	res.write( data );
//	res.end('\n');
//    });
//});


var sfrProg = {test: './a.out'};

function RunningProgs(){
    this.progs = [];
};

RunningProgs.prototype.add = function(prog){
    this.progs.push(prog);
};

RunningProgs.prototype.remove = function(pidToRemove){
    var pids = [];
    for(var i=0; i<this.progs.length; i++){
	pids.push(this.progs[i].pid);
    }

    var indexToRemove = pids.indexOf(pidToRemove);    

    if(indexToRemove !== -1){
	this.progs.splice(indexToRemove, 1);
    } else{
	console.log("remove: the pid was allready killed");
    }
};


RunningProgs.prototype.kill = function(pidToKill){
    var pids = [];
    for(var i=0; i<this.progs.length; i++){
	pids.push(this.progs[i].pid);
    }

    console.log(pids);
    console.log(pidToKill);
    var indexToKill = pids.indexOf(pidToKill);    
    console.log(indexToKill);

    if(indexToKill !== -1){
	try{
	    console.log('trying to kill '+ pidToKill);
	    this.progs[indexToKill].kill();
	    console.log('RIP '+  this.progs[indexToKill].pid);
	}catch(e){
	    console.log(e);
	}

	this.remove(pidToKill);
    }else{
	console.log("could not find this pid");
    }
};

RunningProgs.prototype.killAll = function(){

    for(var i=this.progs.length-1; i>=0; i--){
	console.log(i);
	console.log(this.progs[i].pid);
	this.kill(this.progs[i].pid);
    }
};


//websocket
io.sockets.on('connection', function (socket) {
    var runningProgs = new RunningProgs();

    socket.on('start', function(whatToDo){
	console.log('start');

	var partMsg = {msg:''};
	var spawn = require('child_process').spawn;
	var prog = spawn(sfrProg[whatToDo.exec.exec], whatToDo.exec.opt, {cwd: MODELS_PATH}); 

	runningProgs.add(prog);

	prog.stdin.write(JSON.stringify(whatToDo.sfrSettings)+'\n', encoding="utf8");	

	prog.stderr.on('data', function (data) {
	    console.log(data.toString('utf8'));
	});

	prog.stdout.on('data', function (data) {
	    dispatch(data, socket, partMsg);
	});

	socket.on("set",function(data){
	    prog.stdin.write(JSON.stringify(data)+'\n', encoding="utf8");
	});

	
	prog.on('exit', function (code) {
	    console.log('child process ' +prog.pid + ' exited with code ' + code);
	    runningProgs.remove(prog.pid);
	    socket.emit('theEnd', 'prog end');
	    socket.removeAllListeners("killme");
	    socket.removeAllListeners("set");
	});

	socket.on("killme",function(data){
	    console.log('kill me');
	    runningProgs.kill(prog.pid);
	});


    }); //terminated socket.on('start'... callback    

    socket.on("disconnect",function(){
	console.log('disconnect, killing remaining running prog:');
	runningProgs.killAll();
    });

});


function dispatch(data, socket, partMsg){
    //send data (JSON strings) received from the C prog to the websocket.
    //potential difficulties, the data can contain only a partial JSON string or several strings separated by \n

    var mydata = data.toString('utf8');
    var dataArray;

    //we concatenate cut messages:
    if (mydata[mydata.length-1] === '\n'){
	mydata = partMsg.msg + mydata;
	partMsg.msg = '';

	dataArray = mydata.split('\n');

	for(var i=0; i< dataArray.length ; i++){
	    if(dataArray[i]){
		try{//just to be on the safe side and avoid a parsing error if the JSON string is cut
		    var mydata = JSON.parse(dataArray[i]);
		    socket.emit('sfr', mydata);
		}
		catch(e){console.log(e)};
	    }
	}
    }
    else{ //message is incomplete, we wait for the next part...
	partMsg.msg = partMsg.msg + mydata;
    }
    
}

