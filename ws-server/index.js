var io = require('socket.io')
  , path = require('path')
  , spawn = require('child_process').spawn;

var plomProg = {smc:      {bin:'./smc',      flag:'filter'},
                kalman:   {bin:'./kalman',   flag:'filter'},
                simul:    {bin:'./simul',    flag:'simul'},
                ic:       {bin:'./simul',    flag:'ic'},
                mif:      {bin:'./mif',      flag:'mif'},
                pmcmc:    {bin:'./pmcmc',    flag:'mcmc'},
                kmcmc:    {bin:'./kmcmc',    flag:'mcmc'},
                simplex:  {bin:'./simplex',  flag:'simplex'},
                ksimplex: {bin:'./ksimplex', flag:'simplex'}};

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


function dispatch(data, socket, partMsg, emitFlag){
    //send data (JSON strings) received from the C prog to the websocket.
    //potential difficulties, the data can contain only a partial JSON string or several strings separated by \n

    var dataArray;

    //we concatenate cut messages:
    if (data[data.length-1] === '\n'){
        data = partMsg.msg + data;
        partMsg.msg = '';

        dataArray = data.split('\n');

        for(var i=0; i< dataArray.length ; i++){
            if(dataArray[i]){
                try{//just to be on the safe side and avoid a parsing error if the JSON string is cut
                    socket.emit(emitFlag, JSON.parse(dataArray[i]));
                }
                catch(e){console.log(e)};
            }
        }
    }
    else{ //message is incomplete, we wait for the next part...
        partMsg.msg = partMsg.msg + data;
    }

};

function handleErrUpd(prog, data, socket, partErr, updateMsg, emitFlag){
    //handles errors and updates

    var dataArray;

    //we concatenate cut messages:
    if (data[data.length-1] === '\n'){
        data = partErr.msg + data;
        partErr.msg = '';

        dataArray = data.split('\n');
        //	console.log(dataArray);

        for(var i=0; i< dataArray.length ; i++){
            if(dataArray[i]){
                try{//just to be on the safe side and avoid a parsing error if the JSON string is cut
                    var mymsg = JSON.parse(dataArray[i]);
                    switch (mymsg.flag) {
                    case 'err':

                        socket.emit(emitFlag, mymsg);
                        break;

                    case 'upd':

                        //TODO add setTimeout to ensure that the browser is not overflowed...
                        //			console.log('sending', JSON.stringify(updateMsg.msg));
                        var now = new Date();
                        if ((now - updateMsg.lastTime) > updateMsg.lag) {
                            //console.log('now');
                            updateMsg.lastTime = now;
                            prog.stdin.write(JSON.stringify(updateMsg.msg)+'\n', encoding="utf8");
                            updateMsg.msg = {}; //reset
                        } else {
                            updateMsg.timeoutId = setTimeout(function() {
                                //console.log('wait');
                                updateMsg.lastTime = new Date();
                                prog.stdin.write(JSON.stringify(updateMsg.msg)+'\n', encoding="utf8");
                                updateMsg.msg = {}; //reset
                            }, updateMsg.lag);
                        }

                        break;

                    }
                }
                catch(e){console.log(e)};
            }
        }
    }
    else{ //message is incomplete, we wait for the next part...
        partErr.msg = partErr.msg + data;
    }

};


function wsServer(server) {

  io = io.listen(server);
  io.set('log level', 0);

  //websocket
  io.sockets.on('connection', function (socket) {
    var runningProgs = new RunningProgs();

    socket.on('start', function(whatToDo){
      console.log('start');
      console.log(runningProgs);

      var partMsg = {msg:''};
      var partErr = {msg:''};
      var updateMsg = {msg:{},
                       lastTime: new Date(),
                       timeoutId: null,
                       lag: 10}; //we wait at least lag ms in between msg in order not to saturate the client with msgs

      if(plomProg.hasOwnProperty(whatToDo.exec.exec)){
        var cwd = path.join(process.env.HOME, 'built_plom_models', whatToDo.plomModelId, 'model');
        var prog = spawn(plomProg[whatToDo.exec.exec]['bin'], whatToDo.exec.opt, {cwd: cwd});
        prog.stdout.setEncoding('utf8');
        prog.stderr.setEncoding('utf8');

        runningProgs.add(prog);

        console.log(plomProg[whatToDo.exec.exec]['bin'], whatToDo.exec.opt, {cwd: cwd});
        console.log(prog.pid);
        prog.stdin.write(JSON.stringify(whatToDo.theta)+'\n', encoding="utf8");

        prog.stderr.on('data', function (data) {
          //console.log(data.toString('utf8'));
          handleErrUpd(prog, data, socket, partErr, updateMsg, plomProg[whatToDo.exec.exec]['flag']);
        });
        //
        prog.stdout.on('data', function (data) {
          //console.log(data.toString('utf8'));
          dispatch(data, socket, partMsg, plomProg[whatToDo.exec.exec]['flag']);
        });

        prog.on('exit', function (code) {
          //console.log(updateMsg.timeoutId);
          clearTimeout(updateMsg.timeoutId); //clear the timeout as prog don't exist anymore'
          console.log('child process ' +prog.pid + ' exited with code ' + code);
          runningProgs.remove(prog.pid);
          socket.emit('theEnd', 'prog end');
          socket.removeAllListeners("killme");
          socket.removeAllListeners("set");
        });

        socket.on("set",function(data){
          updateMsg.msg = data;
        });

        socket.on("killme",function(data){
          console.log('kill me');
          runningProgs.kill(prog.pid);
        });

      } else {
        socket.emit('info', {flag:'err', msg: 'Critical failure: ' + whatToDo.exec.exec + ' is not a PLoM program. This incident and your IP have been reported'});
        socket.emit('theEnd', 'prog end');
      }

    }); //terminated socket.on('start'... callback

    socket.on("disconnect",function(){
      console.log('disconnect, killing remaining running prog:');
      runningProgs.killAll();
    });

  });

};

exports.listen = wsServer;
