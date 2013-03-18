var sfrGlobal = {'modelId':undefined,
                 'consoleCounter':0,
                 'intervalId': [],
                 'canRun':true
                }

function addSlider(slider_id){
    var slideMax=100.0;

    var tmp = slider_id.split('___');

    var sliderType = tmp[1];
    var parType = tmp[2];
    var parName = tmp[3];
    var groupId = $('select.grouping[name= "group___' + sliderType + '___' + parType + '___' +parName +'"]').val();

    var sliderId = [sliderType, parType, parName].join('___'); //to identify a slider
    var parId = [parType, parName, groupId].join('___'); //to identify parameters table


    if(sliderType === 'guess'){
        var par_val = parseFloat($('input.parameters[name= "guess___' + parId + '"]').val());
        var par_min = parseFloat($('input.parameters[name= "min___' + parId + '"]').val());
        var par_max = parseFloat($('input.parameters[name= "max___' + parId + '"]').val());
    } else {
        var par_val = parseFloat($('input.parameters[name= "jump_size___' + parId + '"]').val());
        var par_min = 0.0;
        var par_max = parseFloat($('input.parameters[name= "guess___' + parId + '"]').val());
    }


    $('#caption___' + sliderId).html(par_val);
    $( '#slider___'+ sliderId).slider({
        range: 'min',
        value:  ((par_val-par_min)/(par_max-par_min))*slideMax,
        min: 0.0,
        max: slideMax,
        animate: true,
        slide: function( event, ui ) {
            var res=(ui.value/slideMax*(par_max-par_min)+par_min);
            res = (res < 0.5) ? res.toExponential(1): res.toPrecision(4);
            $('input.parameters[name= "' + sliderType + '___' + parId +'"]').val(res);
            $('#caption___' + sliderId).html(res);
        },
        stop: function(event, ui) {
            $('input.parameters[name= "' + sliderType + '___' + parId +'"]').trigger('change');
        }
    });
};


function getExec(){

    var method = $('input[name=filter]:checked').val();
    var integration = $('input[name=integration_method]:checked').val();
    var J = parseInt($('input#n_realisations').val(), 10);

    var exec = {traj: {exec:'smc'+ '_' + integration + '_traj' , opt: ['-J ' +J, '-t', '-b', '-P 1']},
                smc: {exec:'smc'+ '_' + integration + '_traj', opt: ['-J ' +J, '-b', '-P 1']},
                kalman: {exec:'kalman', opt: []}};

    return exec[method];
};

function runSMC(socket, sfrTs){

    $('#loading').show();
    sfrGlobal.consoleCounter = 0;
    $('div#logs').html('<p></p>');

    sfrTs.data_ts = sfrTs.set_data_ts();
    sfrTs.use_ts();

    if(sfrTs.graph_drift){
        sfrTs.data_drift = sfrTs.set_data_drift();
    }

    if(socket){
        socket.emit('start', {'exec':getExec(), 'sfrModelId':sfrGlobal.modelId, 'sfrSettings':sfrTs.sfrSettings});

        sfrGlobal.intervalId.push(setInterval(function(){
            sfrTs.graphRef.updateOptions( { 'file': sfrTs.dataRef } );
            if(sfrTs.graph_drift){
                sfrTs.graph_drift.updateOptions( { 'file': sfrTs.data_drift } );
            }
        }, 200));

    } else{
        alert("Can't connect to the websocket server");
    }

};

function runSlice(socket, sfrBest){

    var method = $('input[name=filter]:checked').val();
    var integration = $('input[name=integration_method]:checked').val();
    var J = parseInt($('n_realisations').val(), 10);

    var exec = {traj: {exec:'smc'+ '_' + integration , opt: ['-J ' +J, '-t', '-x', '-h']},
                smc: {exec:'smc'+ '_' + integration, opt: ['-J ' +J, '-x', '-h']},
                kalman: {exec:'kalman', opt: []}};


    $('#loading').show();
    sfrGlobal.consoleCounter = 0;
    $('div#logs').html('<p></p>');

    sfrBest.data = sfrBest.set_data();

    if(socket){
        socket.emit('start', {'exec':exec[method], 'sfrModelId':sfrGlobal.modelId, 'sfrSettings':sfrBest.sfrSettings});
    } else{
        alert("Can't connect to the websocket server");
    }

};


function runGetIc(socket, sfrTs){

    var integration = $('input[name=integration_method]:checked').val();

    $('#loading').show();
    sfrGlobal.consoleCounter = 0;
    $('div#logs').html('<p></p>');


    var t_transiant = parseFloat($('input[name=get_ic]').val());

    sfrTs.use_ic();

    if(socket){
        socket.emit('start', {'exec':{'exec':'simul_'+ integration, 'opt':['-T ' + t_transiant, '-D 1']}, 'sfrModelId':sfrGlobal.modelId, 'sfrSettings':sfrTs.sfrSettings});
    } else{
        alert("Can't connect to the websocket server");
    }

};



function runPred(socket, sfrTs){

    var integration = $('input[name=integration_method]:checked').val();

    $('#loading').show();
    sfrGlobal.consoleCounter = 0;
    $('div#logs').html('<p></p>');

    var t0 = sfrTs.setAndGet_indexDataClicked();
    var extraLength = parseInt($('input[name=extraLength]').val(), 10);
    var t_end = sfrTs.N_DATA + extraLength;

    sfrTs.data_pred = sfrTs.set_data_pred(extraLength);
    sfrTs.graph_pred.updateOptions( { 'file': sfrTs.data_pred } );
    sfrTs.use_pred();

    if(socket){
        socket.emit('start', {'exec':{'exec':'simul_'+ integration+ '_traj', 'opt':['-T 0', '-D '+ t_end, '-o '+ t0]}, 'sfrModelId':sfrGlobal.modelId, 'sfrSettings':sfrTs.makeSettingsPred()});

        sfrGlobal.intervalId.push(setInterval(function(){
            sfrTs.graphRef.updateOptions( { 'file': sfrTs.dataRef } );
        }, 1000));

    } else {
        alert("Can't connect to the websocket server");
    }

};


function runSimplex(socket, sfrBest){

    $('#loading').show();
    sfrGlobal.consoleCounter = 0;
    $('div#logs').html('<p></p>');

    var l = parseFloat($('input.simplex[name=-l]').val());
    var M = parseInt($('input.simplex[name=-M]').val(), 10);
    var S = parseFloat($('input.simplex[name=-S]').val());
    var opt = ['-l '+l, '-M '+ M, '-S '+S ];

    sfrBest.data_simplex = sfrBest.set_data();
    sfrBest.use_simplex();

    if(socket){
        socket.emit('start', {'exec':{'exec': (sfrBest.sfrSettings.orders.drift_var.length > 0) ? 'simplex_kalman': 'simplex', 'opt':opt}, 'sfrModelId':sfrGlobal.modelId, 'sfrSettings':sfrBest.sfrSettings});

        sfrGlobal.intervalId.push(setInterval(function(){
            sfrBest.graph_simplex.updateOptions( { 'file': sfrBest.data_simplex } );
        }, 300));
    } else{
        alert("Can't connect to the websocket server");
    }
}


function runMif(socket, sfrBest, sfrMif){

    $('#loading').show();
    sfrGlobal.consoleCounter = 0;
    $('div#logs').html('<p></p>');

    var integration = $('input[name=integration_method]:checked').val();

    var a = parseFloat($('input.mif[name=-a]').val());
    var b = parseFloat($('input.mif[name=-b]').val());
    var L = parseInt($('input.mif[name=-L]').val(), 10);
    var M = parseInt($('input.mif[name=-M]').val(), 10);
    var l = parseFloat($('input.mif[name=-l]').val());
    var S = parseInt($('input.mif[name=-S]').val(), 10);
    var J = parseInt($('input.mif[name=-J]').val(), 10);

    var opt = ['-a ' + a, '-b ' + b, '-L ' + L, '-M ' + M, '-l ' + l, '-S ' + S, '-J ' + J, '-P 1'];

    sfrBest.data_mif = sfrBest.set_data();
    sfrBest.use_mif();

    sfrMif.data = sfrMif.set_data();

    if(socket){
        socket.emit('start', {'exec':{'exec':'mif_'+integration+'_traj', 'opt':opt}, 'sfrModelId':sfrGlobal.modelId, 'sfrSettings':sfrBest.sfrSettings});

        sfrGlobal.intervalId.push(setInterval(function(){
            sfrBest.graph_mif.updateOptions( { 'file': sfrBest.data_mif } );
        }, 1000));

//	sfrGlobal.intervalId.push(setInterval(function(){
//          sfrMif.graph.updateOptions( { 'file': sfrMif.data } );
//	}, 200));

    } else{
        alert("Can't connect to the websocket server");
    }
}


function runPmcmc(socket, sfrBest, sfrPmcmc){

    $('#loading').show();
    sfrGlobal.consoleCounter = 0;
    $('div#logs').html('<p></p>');

    var integration = $('input[name=integration_method]:checked').val();

    var M = parseInt($('input.pmcmc[name=-M]').val(), 10);
    var l = parseFloat($('input.pmcmc[name=-l]').val());
    var J = parseInt($('input.pmcmc[name=-J]').val(), 10);

    var opt = ['-M ' + M, '-l ' + l, '-J ' + J, '-P 1'];

    sfrBest.data_pmcmc = sfrBest.set_data();
    sfrBest.use_pmcmc();

    sfrPmcmc.data = sfrPmcmc.set_data();

    if(socket){
        socket.emit('start', {'exec':{'exec':'pmcmc_'+integration, 'opt':opt}, 'sfrModelId':sfrGlobal.modelId, 'sfrSettings':sfrBest.sfrSettings});

        sfrGlobal.intervalId.push(setInterval(function(){
            sfrBest.graph_pmcmc.updateOptions( { 'file': sfrBest.data_pmcmc } );
            sfrPmcmc.graph.updateOptions( { 'file': sfrPmcmc.data } );
        }, 1000));
    } else{
        alert("Can't connect to the websocket server");
    }
}


function appendLog(msg, err){
    var myconsole = $('div#logs');

    sfrGlobal.consoleCounter++;
    if( (sfrGlobal.consoleCounter > 200) && (sfrGlobal.consoleCounter % 100) === 0){
        $("div#logs p").slice(0,100).remove();
    }

    if(err){
        myconsole.append('<p class="errors">' + msg + '</p>');
    } else{
        myconsole.append('<p>' + msg + '</p>');
    }
    myconsole.scrollTop(myconsole[0].scrollHeight - myconsole.height());
}


function processMsg(msg, sfrTs, sfrBest, sfrMif, sfrPmcmc){

    switch(msg.flag){

    case 'log':
        appendLog(msg.msg, false);
        break;

    case 'err':
        appendLog(msg.msg, true);
        break;

    case 'X':
        //processXRef graphRef and dataRef point to either process_X, graph_ts, data_ts or process_pred, graph_pred and data_pred depending which use_ts() or use_pred() was latter called
        sfrTs.processXRef(msg.msg);
        break;

    case 'hat':
        sfrTs.process_hat(msg.msg);
        break;

    case 'best':
        sfrBest.process_best(msg.msg);
        break;

    case 'mif':
        sfrMif.process(msg.msg);
        break;

    case 'pmcmc':
        sfrPmcmc.process(msg.msg);
        break;

    }

};


//also used in simforence_objects.js (to be improved)
function updateSfrSettingsAndSliders(sfrSettings, $this){

    var myName = $this.attr('name').split('___');
    var valType = myName[0];
    var parType = myName[1];
    var parName = myName[2];
    var groupId = myName[3];

    //update sfrSettings value
    var newValue = $this.val();
    sfrSettings.parameters[parType+'_values'][parName][valType][groupId] = parseFloat(newValue);

    //redraw slider (triger change event on select.grouping to also change the grouping)
    $('select.grouping[name="group___guess___'+ parType + '___' + parName+'"]').val(groupId).trigger('change');
    $('select.grouping[name="group___jump_size___'+ parType + '___' + parName+'"]').val(groupId).trigger('change');

}


$(document).ready(function() {

    //get the Simforence settings from the server
    $.get('/simul/', function(answer){

        var sfrSettings = answer.settings;
        sfrGlobal.modelId = answer.modelId; //gobal variable
        var allParId = answer.allParId;
        var allDriftId = answer.allDriftId;

        ////////////////////////////////////////////////////////////////////////////////////////
        //save parameters values
        ////////////////////////////////////////////////////////////////////////////////////////
        saveParameters(sfrSettings); //defined in saveparameters.js

        ////////////////////////////////////////////////////////////////////////////////////////
        //setup graphs and associated listenners
        ////////////////////////////////////////////////////////////////////////////////////////
        var sfrTs = new SfrTs(sfrSettings, allDriftId, "graphTs", "graphPred", "graphDrift", 'input.plottedTs', 'input.plottedPred', 'input.plottedDrift');
        $('input.plottedTs').change(function(){
            sfrTs.graph_ts.setVisibility(parseInt($(this).attr('name'), 10), $(this).attr('checked'));
            sfrTs.graph_ts.setVisibility(sfrTs.N_TS+parseInt($(this).attr('name'), 10), $(this).attr('checked') );
        });
        $('input.plottedPred').change(function(){
            sfrTs.graph_pred.setVisibility(parseInt($(this).attr('name'), 10), $(this).attr('checked'));
            sfrTs.graph_pred.setVisibility(sfrTs.N_TS+parseInt($(this).attr('name'), 10), $(this).attr('checked') );
        });
        $('input.plottedDrift').change(function(){
            sfrTs.graph_drift.setVisibility(parseInt($(this).attr('name'), 10), $(this).attr('checked'));
        });


        var sfrBest = new SfrBest(sfrSettings, allParId, "graphSimplex", "graphMif", "graphPmcmc", 'input.plottedParSimplex', 'input.plottedParMif', 'input.plottedParPmcmc');
        $('input.plottedParSimplex').change(function(){
            sfrBest.graph_simplex.setVisibility(parseInt($(this).attr('name'), 10), $(this).attr('checked'));
        });


        var sfrMif = new SfrMif(sfrSettings, "graphMifWithin");
        $('input.plottedParMif').change(function(){
            var ind = parseInt($(this).attr('name'), 10);
            var bool = $(this).attr('checked');

            sfrBest.graph_mif.setVisibility(ind, bool);

            if(ind === (sfrBest.allParId.length -1)){
                var indWithin = sfrMif.allParId.length -1;
            } else{
                var indWithin = sfrMif.allParId.indexOf(sfrBest.allParId[ind]);
            }

            if(indWithin !== -1){
                sfrMif.graph.setVisibility(indWithin, bool);
            }
        });


        var sfrPmcmc = new SfrPmcmc(sfrSettings, allParId, "graphPmcmcAccept");
        $('input.plottedParPmcmc').change(function(){

            var ind = parseInt($(this).attr('name'), 10);
            var bool = $(this).attr('checked');

            sfrBest.graph_pmcmc.setVisibility(ind, bool);
            sfrPmcmc.graph.setVisibility(ind, bool);
        });

        ////////////////////////////////////////////////////////////////////////////////////////
        //set GUI elements (tabs have to be setted after graphs otherwise bug!!!!)
        ////////////////////////////////////////////////////////////////////////////////////////
        $( "#tabs_social" ).tabs();
        $( "#tabs" ).tabs();
        $( "#tabsGraphs" ).tabs();
        $('div#tabsInference').tabs();
        $('div#tabsGraphInference').tabs();

        $( ".accordion" ).accordion({autoHeight: false, collapsible: true, active: false});

        $( "div#dialogSave" ).dialog({
            autoOpen: false
        });

        $( "div#dialogJump" ).dialog({
            width: 600,
            autoOpen: false,
            buttons: {
                Ok: function() {
                    $( this ).dialog( "close" );
                }
            }
        });

        $('div#displaystructure').load('/displaystructure/', 'model_id=' + parseInt($('div#displaystructure').attr('model_id')));

        //add sliders
        $('div.slider').each(function() {
            var id=$(this).attr('id');
            addSlider(id);
        });

        //when user change grouping we change the slider
        $('select.grouping').change(function(){
            var myName = $(this).attr('name').split('___');

            var sliderType = myName[1];
            var parType = myName[2];
            var parName = myName[3];

            //change the slider...
            $( 'div#slider___' + sliderType + '___' + parType + '___' + parName ).slider("destroy");
            addSlider('slider___' + sliderType + '___' + parType + '___' + parName);
        });


        ////////////////////////////////////////////////////////////////////////////////////////
        //when user changes values, we update the object originaly fetched from the sfrSettings and redraw the appropriate slider
        ////////////////////////////////////////////////////////////////////////////////////////

        $('input.parameters').change(function() {
            updateSfrSettingsAndSliders(sfrSettings, $(this));

            //guess has been changed -> compute traj
            if($(this).attr('name').indexOf("guess") !== -1){
                $('input#runSMC').trigger('click');
            }

            //jump_size has been changed -> set walk rates
            if($(this).attr('name').indexOf("jump_size") !== -1){
                $('input#setJumpSizes').trigger('click');
            }

        });



        ////////////////////////////////////////////////////////////////////////////////////////
        //websocket
        ////////////////////////////////////////////////////////////////////////////////////////
        try{
            var socket = io.connect('http://127.0.0.1:36261/'); //webfaction 'http://108.59.13.240:36261/'
        }
        catch(e){
            alert(e);
            var socket = null;
        };

        if(socket){
            socket.on('connect', function () {
                //set all callbacks
                socket.on('sfr', function (msg) {
                    processMsg(msg, sfrTs, sfrBest, sfrMif, sfrPmcmc);
                });

                socket.on('theEnd', function (msg) {
                    //be sure that the graph contain all the data (the graph is only updated every x msgs)
                    if(sfrTs.graph_drift){
                        sfrTs.graph_drift.updateOptions( { 'file': sfrTs.data_drift } );
                    }
                    if(sfrTs.dataRef){
                        sfrTs.graphRef.updateOptions( { 'file': sfrTs.dataRef } );
                    }
                    if(sfrBest.dataRef){
                        sfrBest.graphRef.updateOptions( { 'file': sfrBest.dataRef } );
                    }
                    if(sfrMif.data){
                        sfrMif.graph.updateOptions( { 'file': sfrMif.data } );
                    }
                    if(sfrPmcmc.data){
                        sfrPmcmc.graph.updateOptions( { 'file': sfrPmcmc.data } );
                    }

                    //remove actions set with setInterval
                    for(var i=0; i<sfrGlobal.intervalId.length; i++){
                        clearInterval(sfrGlobal.intervalId.pop());
                    }
                    $('#loading').hide();

                    sfrGlobal.canRun = true;

                });

            });

            ////////////////////////////////////////////////////////////////////////////////////////
            //action!
            ////////////////////////////////////////////////////////////////////////////////////////
            $('input.stop').click(function(){
                socket.emit('killme', true);
            });

            $( "input#runSMC" ).click(function(){
                if(sfrGlobal.canRun){
                    sfrGlobal.canRun = false;
                    $('div#tabsGraphs').tabs( "select" , 0 );
                    runSMC(socket, sfrTs);
                }
            });

            $( "input#runSimplex" ).click(function(){
                if(sfrGlobal.canRun){
                    sfrGlobal.canRun = false;
                    $('div#tabsGraphs').tabs( "select" , 1 );
                    $('div#tabsGraphInference').tabs( "select" , 0 );
                    $('div#tabs_social').tabs( "select" , 2 );
                    runSimplex(socket, sfrBest);
                }
            });

            $( "input#runMif" ).click(function(){
                if(sfrGlobal.canRun){
                    sfrGlobal.canRun = false;
                    $('div#tabsGraphs').tabs( "select" , 1 );
                    $('div#tabsGraphInference').tabs( "select" , 1 );
                    $('div#tabs_social').tabs( "select" , 2 );
                    runMif(socket, sfrBest, sfrMif);
                }
            });

            $( "input#runPmcmc" ).click(function(){
                if(sfrGlobal.canRun){
                    sfrGlobal.canRun = false;
                    $('div#tabsGraphs').tabs( "select" , 1 );
                    $('div#tabsGraphInference').tabs( "select" , 2 );
                    $('div#tabs_social').tabs( "select" , 2 );
                    runPmcmc(socket, sfrBest, sfrPmcmc);
                }
            });

            $( "input#runPred" ).click(function(){
                if(sfrGlobal.canRun){
                    sfrGlobal.canRun = false;
                    $('div#tabsGraphs').tabs( "select" , 2 );
                    runPred(socket, sfrTs);
                }
            });

            $( "input#getIc" ).click(function(){
                if(sfrGlobal.canRun){
                    sfrGlobal.canRun = false;
                    runGetIc(socket, sfrTs);
                }
            });

            $( "input#setJumpSizes" ).click(function(){
                $('div#tabsGraphs').tabs( "select" , 1 );
                $('div#tabsGraphInference').tabs( "select" , 2 );
                $('div#tabs_social').tabs( "select" , 2 );

                if(socket){
                    socket.emit('set', sfrSettings);
                } else{
                    alert("Can't connect to the websocket server");
                }

            });



        }

        ////////////////////////////////////////////////////////////////////////////////////////
        //download
        ////////////////////////////////////////////////////////////////////////////////////////
        $('#download').click(function(){

            $('div#loading').show();
            $('#downloadlink').html('');

            $.post("/downloadsource/", "settings="+JSON.stringify(sfrSettings), function(answer){
                $('#downloadlink').html(answer.link);
                $('div#loading').hide();
            });

        });

    });

});
