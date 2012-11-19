var plomGlobal = {'modelId':null,
                 'consoleCounter':0,
                 'intervalId': [],
                 'canRun':true}

function addSlider(par, group, iSettings){

  var $input = $('input[name= "intervention___' + par + '___' + group + '"]');
  var $caption = $('#caption___' + par + '___' + group);

  var slideMax=1000;
  var par_val = parseFloat($input.val());

  var par_min = iSettings['parameters'][par]['min'][group];
  var par_max = iSettings['parameters'][par]['max'][group];

  $caption.html((par_val*100).toFixed(1) + '%');
  $('#slider___'+ par + '___' + group).slider({
    range: 'min',
    value:  ((par_val-par_min)/(par_max-par_min))*slideMax,
    min: 0.0,
    max: slideMax,
    animate: true,
    slide: function( event, ui ) {
      var res=(ui.value/slideMax*(par_max-par_min)+par_min);
      $input.val(res);
      $caption.html((res*100).toFixed(1) + '%');
    },
    stop: function(event, ui) {
      //update iSettings
      var id = $(this).attr('id').split('___');
      iSettings['parameters'][id[1]]['guess'][id[2]] = ui.value/slideMax;
      //run the intervention simulation
      $('#runPred').trigger('click');
    }
  });
};


function myDygraph(divGraph, data, options){
  ////////////////////////////////////////////////////////////////////////////////////////
  //Workaround for Issue 238 of dygraphs: Canvas & container div
  //have zero height and width when parent is
  //invisible. http://code.google.com/p/dygraphs/issues/detail?id=238
  ////////////////////////////////////////////////////////////////////////////////////////

  var g = new Dygraph(document.getElementById(divGraph),
                      data,
                      options
                     );

  ////////////////////////////////////////////////////////////////////////////////////////
  //Workaround for Issue 238 of dygraphs: Canvas & container div
  //have zero height and width when parent is
  //invisible. http://code.google.com/p/dygraphs/issues/detail?id=238
  ////////////////////////////////////////////////////////////////////////////////////////
  var $chartdiv = $('.chartdiv').first();
  g.resize($chartdiv.width(), $chartdiv.height());

  return g;
}

function appendLog(msg, err){
  var myconsole = $('div#logs');

  plomGlobal.consoleCounter++;
  if( (plomGlobal.consoleCounter > 200) && (plomGlobal.consoleCounter % 100) === 0){
    $("div#logs p").slice(0,100).remove();
  }

  if(err){
    myconsole.append('<p class="errors">' + msg + '</p>');
  } else{
    myconsole.append('<p>' + msg + '</p>');
  }
  myconsole.scrollTop(myconsole[0].scrollHeight - myconsole.height());
}

function runSimul(socket, sfrSimul){

  plomGlobal.consoleCounter = 0;
  $('div#logs').html('<p></p>');

  sfrSimul.data_ts = sfrSimul.set_data(sfrSimul.N_TS);

  if(socket){
    sfrSimul.is_pred = false;
    var integration = $('input[name=sto]').is(':checked') ? 'sto': 'deter';
    sfrSimul.N_SIMUL = parseInt($('input#N_DATA').val(), 10);
    var J = parseInt($('input#n_realisations').val(), 10);

    var N_TRANSIANT = 0;
    if($('input[name=skip_transiant]').is(':checked')){
      N_TRANSIANT = parseInt($('input#N_TRANSIANT').val(), 10);
    }

    var opt = [integration, '--traj', '-D ' +sfrSimul.N_SIMUL, '-T ' + N_TRANSIANT, '-J ' + J];

    socket.emit('start', {'exec':{exec:'simul', opt:opt}, 'sfrModelId':plomGlobal.modelId, 'sfrSettings':sfrSimul.sfrSettings});

    plomGlobal.intervalId.push(setInterval(function(){
      sfrSimul.graph_ts.updateOptions( { 'file': sfrSimul.data_ts } );
    }, 100));

  } else{
    alert("Can't connect to the websocket server");
  }

};


function runGetIc(socket, sfrIc){

  var integration = $('input[name=sto]').is(':checked') ? 'sto': 'deter';

  plomGlobal.consoleCounter = 0;
  $('div#logs').html('<p></p>');

  var N_TRANSIANT = parseInt($('input#N_TRANSIANT').val(), 10);

  if(socket){
    socket.emit('start', {'exec':{'exec':'ic', 'opt':[integration, '--traj', '-D 0', '-T ' + N_TRANSIANT]}, 'sfrModelId':plomGlobal.modelId, 'sfrSettings':sfrIc.sfrSettings});
  } else{
    alert("Can't connect to the websocket server");
  }

};



/**
 * works for simulation or inference model
 * in case of inference model, sfrSimul is sfrTs...
 */
function runPred(socket, sfrSimul){

  plomGlobal.consoleCounter = 0;
  $('div#logs').html('<p></p>');

  if(socket){
    sfrSimul.is_pred = true;
    var integration = $('input[name=sto]').is(':checked') ? 'sto': 'deter';

    //TO BE CHECKED
    sfrSimul.indexDataClicked = sfrSimul.indexDataClicked || 1;

    var extraYears = parseInt($('select#N_EXTRA').val(), 10) || 0;
    //convert extraYears in timesteps
    var multiplier = {'D': 365, 'W': 365/7, 'M': 12, 'Y':1};
    var N_EXTRA = Math.round(extraYears * multiplier[sfrSimul.sfrSettings.cst.FREQUENCY]);

    sfrSimul.data_pred = sfrSimul.set_data_pred(N_EXTRA);
    sfrSimul.graph_pred.updateOptions( { 'file': sfrSimul.data_pred } );

    var t0 = sfrSimul.indexDataClicked;
    var tend = sfrSimul.data_pred.length-1;
    var J = parseInt($('input#n_realisations_pred').val(), 10);

    socket.emit('start', {'exec':{'exec':'simul', 'opt':[integration, '--traj', '-D '+ tend, '-o '+ t0, '-J ' + J]}, 'sfrModelId':plomGlobal.modelId, 'sfrSettings': sfrSimul.updateiSettings()});
    plomGlobal.intervalId.push(setInterval(function(){
      sfrSimul.graph_pred.updateOptions( { 'file': sfrSimul.data_pred } );
    }, 100));

  } else {
    alert("Can't connect to the websocket server");
  }

};



function runSMC(socket, sfrTs){

  plomGlobal.consoleCounter = 0;
  $('div#logs').html('<p></p>');

  sfrTs.data_ts = sfrTs.set_data_ts();

  if(sfrTs.graph_drift){
    sfrTs.data_drift = sfrTs.set_data_drift();
  }

  if(socket){
    sfrTs.is_pred = false;
    var method = $('input[name=filter]:checked').val();
    var integration = $('input[name=sto]').is(':checked') ? 'sto': 'deter';
    var J = parseInt($('input#n_realisations').val(), 10);

    var exec = {traj:   {exec:'smc',    opt: [integration, '--traj', '-J ' +J, '-t', '-b', '-P 1']},
                smc:    {exec:'smc',    opt: [integration, '--traj', '-J ' +J, '-b', '-P 1']},
                kalman: {exec:'kalman', opt: [integration, '--traj']}};

    socket.emit('start', {'exec':exec[method], 'sfrModelId':plomGlobal.modelId, 'sfrSettings':sfrTs.sfrSettings});

    plomGlobal.intervalId.push(setInterval(function(){
      sfrTs.graph_ts.updateOptions( { 'file': sfrTs.data_ts } );
      if(sfrTs.graph_drift){
        sfrTs.graph_drift.updateOptions( { 'file': sfrTs.data_drift } );
      }
    }, 100));

  } else{
    alert("Can't connect to the websocket server");
  }
};

function runSimplex(socket, sfrBest) {

  plomGlobal.consoleCounter = 0;
  $('div#logs').html('<p></p>');

  sfrBest.data = sfrBest.set_data();

  if(socket){
    var M = parseInt($('input#simplex-M').val(), 10);
    var S = parseFloat($('input#simplex-S').val());
    var integration = $('input[name=sto]').is(':checked') ? 'sto': 'deter';
    var is_drift = (sfrBest.sfrSettings.orders.drift_var.length > 0);
    var opt = []

    if (is_drift){
      var exec = 'ksimplex';
      opt.push(integration);
    } else if (integration=='sto') {
      var exec = 'ksimplex';
      opt.push(integration);
    } else {
      var exec = 'simplex';
    }

    opt = opt.concat(['-M '+ M, '-S '+S ]);

    socket.emit('start', {'exec':{'exec': exec, 'opt':opt}, 'sfrModelId':plomGlobal.modelId, 'sfrSettings':sfrBest.sfrSettings});

    plomGlobal.intervalId.push(setInterval(function(){
      sfrBest.graph.updateOptions( { 'file': sfrBest.data } );
    }, 200));
  } else {
    alert("Can't connect to the websocket server");
  }
}

function runPmcmc(socket, sfrPmcmc){

  plomGlobal.consoleCounter = 0;
  $('div#logs').html('<p></p>');

  sfrPmcmc.data_ar = sfrPmcmc.set_data_ar();
  sfrPmcmc.data = sfrPmcmc.set_data();

  if(socket){

    var integration = $('input[name=sto]').is(':checked') ? 'sto': 'deter';
    var M = parseInt($('input#pmcmc-M').val(), 10);
    var J = parseInt($('input#pmcmc-J').val(), 10);
    var opt = [integration, '-M ' + M, '-J ' + J, '-P 1'];

    socket.emit('start', {'exec':{'exec':'pmcmc', 'opt':opt}, 'sfrModelId':plomGlobal.modelId, 'sfrSettings':sfrPmcmc.sfrSettings});

    plomGlobal.intervalId.push(setInterval(function(){
      sfrPmcmc.graph_ar.updateOptions( { 'file': sfrPmcmc.data_ar } );
      sfrPmcmc.graph.updateOptions( { 'file': sfrPmcmc.data } );
    }, 200));


  } else{
    alert("Can't connect to the websocket server");
  }
}

function runMif(socket, sfrMif){

  plomGlobal.consoleCounter = 0;
  $('div#logs').html('<p></p>');

  sfrMif.data_mif = sfrMif.set_data_mif();
  sfrMif.data = sfrMif.set_data();

  if(socket){

    var integration = $('input[name=sto]').is(':checked') ? 'sto': 'deter';
    var M = parseInt($('input#mif-M').val(), 10);
    var J = parseInt($('input#mif-J').val(), 10);
    var a = parseFloat($('input#mif-a').val());
    var b = parseFloat($('input#mif-b').val());
    var L = parseFloat($('input#mif-L').val());
    var opt = [integration, '--traj', '-M ' + M, '-J ' + J, '-a ' + a, '-b ' + b, '-L ' + L, '-P 1'];

    socket.emit('start', {'exec':{'exec':'mif', 'opt':opt}, 'sfrModelId':plomGlobal.modelId, 'sfrSettings':sfrMif.sfrSettings});

    plomGlobal.intervalId.push(setInterval(function(){
      sfrMif.graph_mif.updateOptions( { 'file': sfrMif.data_mif } );
      sfrMif.graph.updateOptions( { 'file': sfrMif.data } );
    }, 200));

  } else{
    alert("Can't connect to the websocket server");
  }
}


function updateSfrSettings(sfrSettings, $this) {

  var myName = $this.attr('name').split('___');

  var valType = myName[0]; //min max guess...
  var parName = myName[1];
  var groupId = myName[2];

  //update sfrSettings value
  var newValue = $this.val();
  sfrSettings.parameters[parName][valType][groupId] = parseFloat(newValue);
}



$(document).ready(function(){

  ////////////////////////////////////////////////////////////////////////////////////////
  //get the settings.json from the server!
  ////////////////////////////////////////////////////////////////////////////////////////
  $.getJSON('/play' + window.location.search, function(answer){

    var sfrSettings = answer.settings;
    plomGlobal.story = answer.story;
    plomGlobal.context = answer.context;
    plomGlobal.process = answer.process;
    plomGlobal.link = answer.link;
    plomGlobal.modelId = ['demo', plomGlobal.story, plomGlobal.process, plomGlobal.context, plomGlobal.link, 'model'].join('/');

    ////////////////////////////////////////////////////////////////////////////////////////
    //get the process.json from the server!
    ////////////////////////////////////////////////////////////////////////////////////////

    $.getJSON('/process?s='+plomGlobal.story + '&p='+plomGlobal.process, function(answer){
      sfrGraphModel(answer, '#plom-graph-model');
    });

    $.getJSON('/tree?q='+plomGlobal.story, function(answer){

      function breadthFirstSearch(my) {

        while (queue.length) {
          var node = queue.shift();

          if (node.name === my) {
            //found!
            return node;
          } else {
            if (node.children) {
              node.children.forEach(function(el){
                queue.push(el);
              });
            }
          }
        }

        //not found
        return {};
      }
      console.log(answer);
      var queue = [answer];
      //get SIR subtree
      var my  = breadthFirstSearch(plomGlobal.process);
      console.log(plomGlobal.process, my);

      //get SIR/simple subtree
      var queue = [my];
      var my  = breadthFirstSearch(plomGlobal.context);

      d3.select("#plom-tree-graph")
        .datum(my)
        .call(sfr_tree(null, function(){
        }));

    });




    ////////////////////////////////////////////////////////////////////////////////////////
    //when user changes values, we update the object originaly fetched from the sfrSettings
    ////////////////////////////////////////////////////////////////////////////////////////
    $('input.parameters').change(function() {
      //validation

      var myName = $(this).attr('name').split('___');
      var valType = myName[0];
      var parName = myName[1];
      var groupId = myName[2];

      //update sfrSettings value
      var newValue = parseFloat($(this).val());
      $('input.parameters[name="' +  valType + '___' + parName + '___' +groupId + '"]').val(newValue);

      var nbError = 0;

      var $input = {min:       $('input.parameters[name="min___'   + parName + '___' +groupId + '"]'),
                    max:       $('input.parameters[name="max___'   + parName + '___' +groupId + '"]'),
                    guess:     $('input.parameters[name="guess___' + parName + '___' +groupId + '"]'),
                    sd_transf: $('input.parameters[name="sd_transf___' + parName + '___' +groupId + '"]')};

      var vals = {};
      for (k in $input){
        vals[k] =  parseFloat($input[k].val());
      }

      var addError = function(prop){
        $input[prop].parent().addClass('error');
        $input[prop].next().show();
      }

      var removeError = function(prop){
        $input[prop].parent().removeClass('error');
        $input[prop].next().hide();
      }


      if(valType === 'sd_transf') {
        //sd_transf have to be positive!
        if(newValue <0){
          addError('sd_transf'); nbError++;
        } else {
          removeError('sd_transf');
        }
      } else {

        var rangeOK = (vals.guess >= vals.min && vals.guess <= vals.max && vals.min <= vals.max );

        if(!rangeOK){
          nbError++;
          for (k in $input){
            addError(k);
          }
        } else {
          for (k in $input){
            removeError(k);
          }
        }

        switch(sfrSettings.parameters[parName]['transformation']){
        case 'log':
          for (k in vals){
            if(vals[k]<0){
              addError(k); nbError++;
            }
          }
          break;

        case 'logit':
          for (k in vals){
            if(vals[k]<0){
              addError(k); nbError++;
            }
          }

          for (k in vals){
            if(vals[k]>1){
              addError(k); nbError++;
            }
          }
          break;
        }
      }

      //nothing can be run until the error are fixed...
      plomGlobal.canRun = (nbError === 0);

      updateSfrSettings(sfrSettings, $(this));

      //guess has been changed -> compute traj
      if($(this).attr('name').indexOf("guess") !== -1){
        $('#runSMC').trigger('click');
      }

      //sd_transf has been changed -> set walk rates
      if($(this).attr('name').indexOf("sd_transf") !== -1){
        $('#set').trigger('click');
      }

    });

    ////////////////////////////////////////////////////////////////////////////////////////
    //setup graphs and associated listeners
    ////////////////////////////////////////////////////////////////////////////////////////
    var sfrTs = null
    , sfrBest = null
    , sfrPmcmc = null
    , sfrSimul = null;

    var sfrIc = new SfrIc(sfrSettings);

    if(sfrSettings.cst.N_DATA) {

      var sfrTs = new SfrTs(sfrSettings, "graphTs", "graphDrift", "graphPred", 'input.plottedTs', 'input.plottedDrift', 'input.plottedPred');
      $('input.plottedTs').change(function(){
        sfrTs.graph_ts.setVisibility(parseInt($(this).attr('name'), 10), $(this).attr('checked'));
        sfrTs.graph_ts.setVisibility(sfrTs.N_TS+parseInt($(this).attr('name'), 10), $(this).attr('checked') );
      });
      $('input.plottedDrift').change(function(){
        sfrTs.graph_drift.setVisibility(parseInt($(this).attr('name'), 10), $(this).attr('checked'));
      });
      $('input.plottedPred').change(function(){
        sfrTs.graph_pred.setVisibility(parseInt($(this).attr('name'), 10), $(this).attr('checked'));
        sfrTs.graph_pred.setVisibility(sfrTs.N_TS+parseInt($(this).attr('name'), 10), $(this).attr('checked'));
        sfrTs.graph_pred.setVisibility(2*sfrTs.N_TS+parseInt($(this).attr('name'), 10), $(this).attr('checked'));
      });

      var sfrBest = new SfrBest(sfrSettings, "graphSimplex", 'input.plottedParSimplex', updateSfrSettings);
      $('input.plottedParSimplex').change(function(){
        sfrBest.graph.setVisibility(parseInt($(this).attr('name'), 10), $(this).attr('checked'));
      });

      var sfrPmcmc = new SfrPmcmc(sfrSettings, "graphBestPmcmc", 'input.plottedParBestPmcmc', updateSfrSettings, "graphPmcmc");
      $('input.plottedParBestPmcmc').change(function(){
        sfrPmcmc.graph.setVisibility(parseInt($(this).attr('name'), 10), $(this).attr('checked'));
      });
      $('input.plottedParPmcmc').change(function(){
        sfrPmcmc.graph_ar.setVisibility(parseInt($(this).attr('name'), 10), $(this).attr('checked'));
      });

      var sfrMif = new SfrMif(sfrSettings, "graphBestMif", 'input.plottedParBestMif', updateSfrSettings, "graphMif");
      $('input.plottedParBestMif').change(function(){
        sfrMif.graph.setVisibility(parseInt($(this).attr('name'), 10), $(this).attr('checked'));
      });
      $('input.plottedParMif').change(function(){
        sfrMif.graph_mif.setVisibility(parseInt($(this).attr('name'), 10), $(this).attr('checked'));
      });


    } else {
      var sfrSimul = new SfrSimul(sfrSettings, "graphTs", "graphPred", 'input.plottedTs', 'input.plottedPred');
      $('input.plottedTs').change(function(){
        sfrSimul.graph_ts.setVisibility(parseInt($(this).attr('name'), 10), $(this).attr('checked'));
      });
      $('input.plottedPred').change(function(){
        sfrSimul.graph_pred.setVisibility(parseInt($(this).attr('name'), 10), $(this).attr('checked'));
        sfrSimul.graph_pred.setVisibility(sfrSimul.N_TS+parseInt($(this).attr('name'), 10), $(this).attr('checked'));
      });

      //validation
      $('input#N_DATA').change(function(){
        var val = parseInt($(this).val(),10);
        //sanitation
        var myerror = 0;
        if(!val || val < 0.0){
          myerror++;
          val = 1;
        }
        //prevent too high values (150 year)
        var mymax = {'D':150*365, 'W':150*52, 'M':150*12, 'Y':150}[sfrSettings.cst.FREQUENCY]
        if(val > mymax){
          myerror++
          val = mymax
        }

        var $this = $(this);
        var $parent = $(this).parent().parent();

        $this.val(val);
        if(myerror){
          $parent.addClass('error');
          $this.next().show();
          setTimeout(function(){
            $parent.removeClass('error');
            $this.next().hide();
          }, 300);
        }
      });

    }


    //colors tick boxs:
    var cols = d3.scale.category10();
    ['.sfr-tick-simul', '.sfr-tick-drift', '.sfr-tick-pred', '.sfr-tick-simplex', '.sfr-tick-bestpmcmc', '.sfr-tick-pmcmc', '.sfr-tick-bestmif', '.sfr-tick-mif'].forEach(function(el){
      $(el).each(function(i){
        $(this).css('color', cols(i));
      });
    });


    ////////////////////////////////////////////////////////////////////////////////////////
    //GUI
    ////////////////////////////////////////////////////////////////////////////////////////

    $('.sfrTooltip').tooltip({delay: { show: 500, hide: 100 }})

    $('a[data-toggle="tab"]').on('shown', function (e) {
      var activated =  $(e.target).attr('href');

      $('.control').addClass('control-hidden');
      $(activated + '-control').removeClass('control-hidden');

      switch(activated){

      case '#tab-graph-forecasting':

        if(sfrSettings.cst.N_DATA) {

          if(sfrTs.states.length){
            sfrTs.resetForecast();
          } else{
            alert('You need to run a Simulation, SMC or Kalman first !!');
            $('#graphs a[href=#tab-graph-simulation]').tab('show');
          }

        }else {
          if(sfrSimul.states.length){
            sfrSimul.resetForecast();
          } else {
            alert('You need to run a simulation first !!');
            $('#graphs a[href=#tab-graph-simulation]').tab('show');
          }
        }

        break;

      case '#tab-graph-simulation':

        if(sfrSettings.cst.N_DATA) {
          sfrTs.graph_ts.resize();
          if(sfrTs.graph_drift){
            sfrTs.graph_drift.resize();
          }
        } else {
          sfrSimul.graph_ts.resize();
          if(sfrSimul.graph_drift){
            sfrSimul.graph_drift.resize();
          }
        }

        break;
        //case '#tab-graph-mif': //TODO

      }

    })
    //start with simulation tab
    $('#graphs a[href=#tab-graph-simulation]').tab('show');



    ////////////////////////////////////////////////////////////////////////////////////////
    //websocket
    ////////////////////////////////////////////////////////////////////////////////////////
    try{
      var socket = io.connect();
      appendLog("websocket OK !", false);
    }
    catch(e){
      appendLog("Can't connect to the websocket server !!", true);
      var socket = null;
    };

    if(socket) {
      socket.on('connect', function () {
        //set all callbacks

        socket.on('ic', function (msg) {
          sfrIc.processMsg(msg, appendLog);
        });


        if(sfrSettings.cst.N_DATA) {

          socket.on('filter', function (msg) {
            sfrTs.processMsg(msg, appendLog);
          });

          socket.on('simul', function (msg) {
            sfrTs.processMsg(msg, appendLog);
          });

          socket.on('simplex', function (msg) {
            sfrBest.processMsg(msg, appendLog);
          });

          socket.on('mcmc', function (msg) {
            sfrPmcmc.processMsg(msg, appendLog);
          });

          socket.on('mif', function (msg) {
            sfrMif.processMsg(msg, appendLog);
          });

          socket.on('info', function (msg) {
            appendLog(msg.msg, (msg.msg === 'err'));
          });

        } else {

          socket.on('simul', function (msg) {
            sfrSimul.processMsg(msg, appendLog);
          });

        }

        socket.on('theEnd', function (msg) {

          //remove actions set with setInterval
          for(var i=0; i<plomGlobal.intervalId.length; i++){
            clearInterval(plomGlobal.intervalId.pop());
          }

          //be sure that the graph contain all the data (the graph is only updated every x msgs)
          if(sfrSettings.cst.N_DATA) {

            if(sfrTs.graph_drift){
              sfrTs.graph_drift.updateOptions( { 'file': sfrTs.data_drift } );
            }
            if(sfrTs.data_ts){
              sfrTs.graph_ts.updateOptions( { 'file': sfrTs.data_ts } );
            }
            if(sfrBest.data){
              sfrBest.graph.updateOptions( { 'file': sfrBest.data } );
            }
            if(sfrPmcmc.data){
              sfrPmcmc.graph.updateOptions( { 'file': sfrPmcmc.data } );
              sfrPmcmc.graph_ar.updateOptions( { 'file': sfrPmcmc.data_ar } );
            }
            if(sfrMif.data){
              sfrMif.graph.updateOptions( { 'file': sfrMif.data } );
              sfrMif.graph_mif.updateOptions( { 'file': sfrMif.data_mif } );
            }

          }

          plomGlobal.canRun = true;

        });

      });
    } //if socket


    ////////////////////////////////////////////////////////////////////////////////////////
    //action!
    ////////////////////////////////////////////////////////////////////////////////////////
    $('.stop').click(function(){
      socket.emit('killme', true);
    });

    $('.use-in-simulation').click(function(){
      (sfrBest.onClickCalback())(); //sure we can do better
      $('#runSMC').trigger('click');
    });

    $("#runSMC").click(function(){
      if(plomGlobal.canRun){
        plomGlobal.canRun = false;
        $('#graphs a:first').tab('show');
        if(sfrSettings.cst.N_DATA) {
          runSMC(socket, sfrTs);
        } else {
          runSimul(socket, sfrSimul);
        }
      }
    });

    $("#getIc").click(function(){
      if(plomGlobal.canRun){
        plomGlobal.canRun = false;
        runGetIc(socket, sfrIc);
      }
    });

    $("#runSimplex").click(function(){
      if(plomGlobal.canRun){
        plomGlobal.canRun = false;
        $('#graphs a[href=#tab-graph-simplex]').tab('show');
        runSimplex(socket, sfrBest);
      }
    });

    $("#runPmcmc").click(function(){
      if(plomGlobal.canRun){
        plomGlobal.canRun = false;
        $('#graphs a[href=#tab-graph-pmcmc]').tab('show');
        runPmcmc(socket, sfrPmcmc);
      }
    });

    $("#runMif").click(function(){
      if(plomGlobal.canRun){
        plomGlobal.canRun = false;
        $('#graphs a[href=#tab-graph-mif]').tab('show');
        runMif(socket, sfrMif);
      }
    });

    $("#set").click(function(){
      if(socket){
        socket.emit('set', sfrSettings);
      } else{
        alert("Can't connect to the websocket server");
      }
    });

    $("#runPred").click(function(){
      if(plomGlobal.canRun){
        plomGlobal.canRun = false;
        runPred(socket,(sfrSettings.cst.N_DATA) ? sfrTs : sfrSimul);
      }
    });

    $("#resetPred").click(function(){
      if(sfrSettings.cst.N_DATA) {
        sfrTs.resetForecast();
      } else {
        sfrSimul.resetForecast();
        sfrSimul.saved_graph_updater([0,0,0,0]);
      }
    });

    ////////////////////////////////////////////////////////////////////////////////////////
    // INTERVENTION
    ////////////////////////////////////////////////////////////////////////////////////////

    var iSettings = $.extend(true, {}, sfrSettings);

    //link par_proc and par_obs of iSettings and sfrSettings !=intervention  so
    //that the 2 stay synchronized. Note that we do not link par_sv has they have to remain independent...
    ['par_proc', 'par_obs'].forEach(function(el){
      sfrSettings['orders'][el].forEach(function(par){
        if (! ('intervention' in  iSettings.parameters[par]) && ! iSettings.parameters[par]['intervention']) {
          iSettings['parameters'][par] = sfrSettings['parameters'][par];
        }
      });
    });


    if(sfrSettings.cst.N_DATA) {
      sfrTs.iSettings = iSettings;
    } else{
      sfrSimul.iSettings = iSettings;
    }

    if (!sfrSettings.cst.N_DATA) {
      iSettings.orders.par_sv.concat(iSettings.orders.par_proc, iSettings.orders.par_obs).forEach(function(el){
        if (('intervention' in  iSettings.parameters[el]) && iSettings.parameters[el]['intervention']) {
          iSettings.partition[iSettings.parameters[el]['partition_id']]['group'].forEach(function(group, i) {
            addSlider(el, group.id, iSettings);
          });
        }
      });
    }

  });

});
