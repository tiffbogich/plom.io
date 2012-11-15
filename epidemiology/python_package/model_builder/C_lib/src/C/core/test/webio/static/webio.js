var hasBeenSet;

function run(data, socket){    

    $('div#logs').html('<p></p>');

    if(socket){
	socket.emit('start', {'exec':{'exec':'test', 'opt':[]}, 'sfrSettings':data});
    } else{ 
	alert("Can't connect to the websocket server");
    }

}

function set(data, socket){    

    if(socket){
	socket.emit('set', data);
    } else{ 
	alert("Can't connect to the websocket server");
    }

}


function processMsg(msg, socket){
    var myconsole = $('div#logs');

    switch(msg.flag){
    case 'log':
	myconsole.append(msg.msg.replace(/\n/g,"<br>")+'<br>');
	myconsole.scrollTop(myconsole[0].scrollHeight - myconsole.height());
	break;
    case 'upd':
	if(hasBeenSet){
	    set({'set':Math.random()}, socket);
	    hasBeenSet = false;
	}else{
	    set({'set':false}, socket);
	}
	break;
    }


};


$(document).ready(function() {

    ////////////////////////////////////////////////////////////////////////////////////////
    //websocket
    ////////////////////////////////////////////////////////////////////////////////////////
    try{
	var socket = io.connect('http://localhost:8000');
    }
    catch(e){
	alert(e);
	var socket = null;
    };


    if(socket){
	socket.on('connect', function () {
	    //set all callbacks
	    socket.on('sfr', function (msg) {
		processMsg(msg, socket);
	    });

	    socket.on('theEnd', function (msg) {
		$('#loading').hide();
	    });

	});

	$('input.stop').click(function(){
	    socket.emit('killme', true);
	});
    }


    ////////////////////////////////////////////////////////////////////////////////////////
    //action!
    ////////////////////////////////////////////////////////////////////////////////////////
    $( "input#run" ).click(function(){
	run({'set':"start"}, socket);
    });

    $( "input#set" ).click(function(){
	hasBeenSet = true;
    });    

});


