var plomGlobal = {'modelId':null,
                 'consoleCounter':0,
                 'intervalId': [],
                 'canRun':true}

function addSlider(par, group, itheta){

  var $input = $('input[name= "intervention___' + par + '___' + group + '"]');
  var $caption = $('#caption___' + par + '___' + group);

  var slideMax=1000;
  var par_val = parseFloat($input.val());

  var par_min = itheta.value[par]['min'][group];
  var par_max = itheta.value[par]['max'][group];

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
      //update itheta
      var id = $(this).attr('id').split('___');
      itheta.value[id[1]]['guess'][id[2]] = ui.value/slideMax;
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

function runSimul(socket, plomSimul){

  plomGlobal.consoleCounter = 0;
  $('div#logs').html('<p></p>');

  plomSimul.data_ts = plomSimul.set_data(plomSimul.N_TS);

  if(socket){
    plomSimul.is_pred = false;
    var integration = $('input[name=sto]').is(':checked') ? 'sto': 'deter';
    plomSimul.N_SIMUL = parseInt($('input#N_DATA').val(), 10);
    var J = parseInt($('input#n_realisations').val(), 10);

    var N_TRANSIANT = 0;
    if($('input[name=skip_transiant]').is(':checked')){
      N_TRANSIANT = parseInt($('input#N_TRANSIANT').val(), 10);
    }

    var opt = [integration, '--traj', '-D ' +plomSimul.N_SIMUL, '-T ' + N_TRANSIANT, '-J ' + J];

    socket.emit('start', {'exec':{exec:'simul', opt:opt}, 'plomModelId':plomGlobal.modelId, 'theta':plomSimul.theta});

    plomGlobal.intervalId.push(setInterval(function(){
      plomSimul.graph_ts.updateOptions( { 'file': plomSimul.data_ts } );
    }, 100));

  } else{
    alert("Can't connect to the websocket server");
  }

};


function runGetIc(socket, plomIc){

  var integration = $('input[name=sto]').is(':checked') ? 'sto': 'deter';

  plomGlobal.consoleCounter = 0;
  $('div#logs').html('<p></p>');

  var N_TRANSIANT = parseInt($('input#N_TRANSIANT').val(), 10);

  if(socket){
    socket.emit('start', {'exec':{'exec':'ic', 'opt':[integration, '--traj', '-D 0', '-T ' + N_TRANSIANT]}, 'plomModelId':plomGlobal.modelId, 'theta':plomIc.theta});
  } else{
    alert("Can't connect to the websocket server");
  }

};



/**
 * works for simulation or inference model
 * in case of inference model, plomSimul is plomTs...
 */
function runPred(socket, plomSimul){

  plomGlobal.consoleCounter = 0;
  $('div#logs').html('<p></p>');

  if(socket){
    plomSimul.is_pred = true;
    var integration = $('input[name=sto]').is(':checked') ? 'sto': 'deter';

    //TO BE CHECKED
    plomSimul.indexDataClicked = plomSimul.indexDataClicked || 1;

    var extraYears = parseInt($('select#N_EXTRA').val(), 10) || 0;
    //convert extraYears in timesteps
    var multiplier = {'D': 365, 'W': 365/7, 'M': 12, 'Y':1};

    var N_EXTRA = Math.round(extraYears * multiplier[plomSimul.FREQUENCY]);


    plomSimul.data_pred = plomSimul.set_data_pred(N_EXTRA);
    plomSimul.graph_pred.updateOptions( { 'file': plomSimul.data_pred } );

    var t0 = plomSimul.indexDataClicked;
    var tend = plomSimul.data_pred.length-1;
    var J = parseInt($('input#n_realisations_pred').val(), 10);

    socket.emit('start', {'exec':{'exec':'simul', 'opt':[integration, '--traj', '-D '+ tend, '-o '+ t0, '-J ' + J]}, 'plomModelId':plomGlobal.modelId, 'theta': plomSimul.updateitheta()});
    plomGlobal.intervalId.push(setInterval(function(){
      plomSimul.graph_pred.updateOptions( { 'file': plomSimul.data_pred } );
    }, 100));

  } else {
    alert("Can't connect to the websocket server");
  }

};



function runSMC(socket, plomTs){

  plomGlobal.consoleCounter = 0;
  $('div#logs').html('<p></p>');

  plomTs.data_ts = plomTs.set_data_ts();

  if(plomTs.graph_drift){
    plomTs.data_drift = plomTs.set_data_drift();
  }

  if(socket){
    plomTs.is_pred = false;
    var method = $('input[name=filter]:checked').val();
    var integration = $('input[name=sto]').is(':checked') ? 'sto': 'deter';
    var J = parseInt($('input#n_realisations').val(), 10);

    var exec = {traj:   {exec:'smc',    opt: [integration, '--traj', '-J ' +J, '-t', '-b', '-P 1']},
                smc:    {exec:'smc',    opt: [integration, '--traj', '-J ' +J, '-b', '-P 1']},
                kalman: {exec:'kalman', opt: [integration, '--traj']}};

    socket.emit('start', {'exec':exec[method], 'plomModelId':plomGlobal.modelId, 'theta':plomTs.theta});

    plomGlobal.intervalId.push(setInterval(function(){
      plomTs.graph_ts.updateOptions( { 'file': plomTs.data_ts } );
      if(plomTs.graph_drift){
        plomTs.graph_drift.updateOptions( { 'file': plomTs.data_drift } );
      }
    }, 100));

  } else{
    alert("Can't connect to the websocket server");
  }
};

function runSimplex(socket, plomBest) {

  plomGlobal.consoleCounter = 0;
  $('div#logs').html('<p></p>');

  plomBest.data = plomBest.set_data();

  if(socket){
    var M = parseInt($('input#simplex-M').val(), 10);
    var S = parseFloat($('input#simplex-S').val());
    var integration = $('input[name=sto]').is(':checked') ? 'sto': 'deter';
    var opt = []

    if (plomBest.is_drift) {
      var exec = 'ksimplex';
      opt.push(integration);
    } else if (integration=='sto') {
      var exec = 'ksimplex';
      opt.push(integration);
    } else {
      var exec = 'simplex';
    }

    opt = opt.concat(['-M '+ M, '-S '+S ]);

    socket.emit('start', {'exec':{'exec': exec, 'opt':opt}, 'plomModelId':plomGlobal.modelId, 'theta':plomBest.theta});

    plomGlobal.intervalId.push(setInterval(function(){
      plomBest.graph.updateOptions( { 'file': plomBest.data } );
    }, 200));
  } else {
    alert("Can't connect to the websocket server");
  }
}

function runPmcmc(socket, plomPmcmc){

  plomGlobal.consoleCounter = 0;
  $('div#logs').html('<p></p>');

  plomPmcmc.data_ar = plomPmcmc.set_data_ar();
  plomPmcmc.data = plomPmcmc.set_data();

  if(socket){

    var integration = $('input[name=sto]').is(':checked') ? 'sto': 'deter';
    var M = parseInt($('input#pmcmc-M').val(), 10);
    var J = parseInt($('input#pmcmc-J').val(), 10);
    var opt = [integration, '-M ' + M, '-J ' + J, '-P 1'];

    socket.emit('start', {'exec':{'exec':'pmcmc', 'opt':opt}, 'plomModelId':plomGlobal.modelId, 'theta':plomPmcmc.theta});

    plomGlobal.intervalId.push(setInterval(function(){
      plomPmcmc.graph_ar.updateOptions( { 'file': plomPmcmc.data_ar } );
      plomPmcmc.graph.updateOptions( { 'file': plomPmcmc.data } );
    }, 200));


  } else{
    alert("Can't connect to the websocket server");
  }
}

function runMif(socket, plomMif){

  plomGlobal.consoleCounter = 0;
  $('div#logs').html('<p></p>');

  plomMif.data_mif = plomMif.set_data_mif();
  plomMif.data = plomMif.set_data();

  if(socket){

    var integration = $('input[name=sto]').is(':checked') ? 'sto': 'deter';
    var M = parseInt($('input#mif-M').val(), 10);
    var J = parseInt($('input#mif-J').val(), 10);
    var a = parseFloat($('input#mif-a').val());
    var b = parseFloat($('input#mif-b').val());
    var L = parseFloat($('input#mif-L').val());
    var opt = [integration, '--traj', '-M ' + M, '-J ' + J, '-a ' + a, '-b ' + b, '-L ' + L, '-P 1'];

    socket.emit('start', {'exec':{'exec':'mif', 'opt':opt}, 'plomModelId':plomGlobal.modelId, 'theta':plomMif.theta});

    plomGlobal.intervalId.push(setInterval(function(){
      plomMif.graph_mif.updateOptions( { 'file': plomMif.data_mif } );
      plomMif.graph.updateOptions( { 'file': plomMif.data } );
    }, 200));

  } else{
    alert("Can't connect to the websocket server");
  }
}


function updatePlomSettings(theta, $this) {

  var myName = $this.attr('name').split('___');

  var valType = myName[0]; //min max guess...
  var parName = myName[1];
  var groupId = myName[2];

  //update theta value
  var newValue = $this.val();
  theta.value[parName][valType][groupId] = parseFloat(newValue);
}



$(document).ready(function(){


  ////////////////////////////////////////////////////////////////////////////////////////
  //get the settings.json from the server
  ////////////////////////////////////////////////////////////////////////////////////////
  $.getJSON('/play', function(answer){

    var plomSettings = answer.settings;
    var theta = answer.theta;
    plomGlobal.modelId = [answer.context_id, answer.process._id, answer.link._id];

    ////////////////////////////////////////////////////////////////////////////////////////
    //get the process.json from the server
    ////////////////////////////////////////////////////////////////////////////////////////
    $.getJSON('/component?_idString=' + answer.process._id, function(process){
      plomGraphModel(process, '#plom-graph-model');
    });


    ////////////////////////////////////////////////////////////////////////////////////////
    //draw subtree (starting at link level)
    ////////////////////////////////////////////////////////////////////////////////////////
    var treeData = makeTreeData(answer.tree, answer.link._id);
    d3.select("#plom-tree-graph")
      .datum(treeData)
      .call(plom_tree(function(report){ //callback onClickNode
        if(report.action === 'theta' && report.theta !== theta._id){
          window.location.replace('/play?&t=' + theta._id);
        }
      }));

    if(!plomSettings.cst.N_DATA) {
      $('#tab-graph-forecasting').addClass('cursorSeringue');
    }


    ////////////////////////////////////////////////////////////////////////////////////////
    //when user changes values, we update the object originaly fetched from the plomSettings
    ////////////////////////////////////////////////////////////////////////////////////////
    $('input.parameters').change(function() {
      //validation

      var myName = $(this).attr('name').split('___');
      var valType = myName[0];
      var parName = myName[1];
      var groupId = myName[2];

      //update plomSettings value
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

        switch(theta.value[parName]['transformation']){
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

      updatePlomSettings(theta, $(this));

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
    var plomTs = null
      , plomBest = null
      , plomPmcmc = null
      , plomSimul = null
      , plomIc = new PlomIc(plomSettings, theta);

    if(plomSettings.cst.N_DATA) {

      var plomTs = new PlomTs(plomSettings, theta, "graphTs", "graphDrift", "graphPred", 'input.plottedTs', 'input.plottedDrift', 'input.plottedPred');
      $('input.plottedTs').change(function(){
        plomTs.graph_ts.setVisibility(parseInt($(this).attr('name'), 10), $(this).attr('checked'));
        plomTs.graph_ts.setVisibility(plomTs.N_TS+parseInt($(this).attr('name'), 10), $(this).attr('checked') );
      });
      $('input.plottedDrift').change(function(){
        plomTs.graph_drift.setVisibility(parseInt($(this).attr('name'), 10), $(this).attr('checked'));
      });
      $('input.plottedPred').change(function(){
        plomTs.graph_pred.setVisibility(parseInt($(this).attr('name'), 10), $(this).attr('checked'));
        plomTs.graph_pred.setVisibility(plomTs.N_TS+parseInt($(this).attr('name'), 10), $(this).attr('checked'));
        plomTs.graph_pred.setVisibility(2*plomTs.N_TS+parseInt($(this).attr('name'), 10), $(this).attr('checked'));
      });

      var plomBest = new PlomBest(plomSettings, theta, "graphSimplex", 'input.plottedParSimplex', updatePlomSettings);
      $('input.plottedParSimplex').change(function(){
        plomBest.graph.setVisibility(parseInt($(this).attr('name'), 10), $(this).attr('checked'));
      });

      var plomPmcmc = new PlomPmcmc(plomSettings, theta, "graphBestPmcmc", 'input.plottedParBestPmcmc', updatePlomSettings, "graphPmcmc");
      $('input.plottedParBestPmcmc').change(function(){
        plomPmcmc.graph.setVisibility(parseInt($(this).attr('name'), 10), $(this).attr('checked'));
      });
      $('input.plottedParPmcmc').change(function(){
        plomPmcmc.graph_ar.setVisibility(parseInt($(this).attr('name'), 10), $(this).attr('checked'));
      });

      var plomMif = new PlomMif(plomSettings, theta, "graphBestMif", 'input.plottedParBestMif', updatePlomSettings, "graphMif");
      $('input.plottedParBestMif').change(function(){
        plomMif.graph.setVisibility(parseInt($(this).attr('name'), 10), $(this).attr('checked'));
      });
      $('input.plottedParMif').change(function(){
        plomMif.graph_mif.setVisibility(parseInt($(this).attr('name'), 10), $(this).attr('checked'));
      });


    } else {
      var plomSimul = new PlomSimul(plomSettings, theta, "graphTs", "graphPred", 'input.plottedTs', 'input.plottedPred');
      $('input.plottedTs').change(function(){
        plomSimul.graph_ts.setVisibility(parseInt($(this).attr('name'), 10), $(this).attr('checked'));
      });
      $('input.plottedPred').change(function(){
        plomSimul.graph_pred.setVisibility(parseInt($(this).attr('name'), 10), $(this).attr('checked'));
        plomSimul.graph_pred.setVisibility(plomSimul.N_TS+parseInt($(this).attr('name'), 10), $(this).attr('checked'));
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
        var mymax = {'D':150*365, 'W':150*52, 'M':150*12, 'Y':150}[plomSettings.cst.FREQUENCY]
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
    ['.plom-tick-simul', '.plom-tick-drift', '.plom-tick-pred', '.plom-tick-simplex', '.plom-tick-bestpmcmc', '.plom-tick-pmcmc', '.plom-tick-bestmif', '.plom-tick-mif'].forEach(function(el){
      $(el).each(function(i){
        $(this).css('color', cols(i));
      });
    });


    ////////////////////////////////////////////////////////////////////////////////////////
    //GUI
    ////////////////////////////////////////////////////////////////////////////////////////

    $('.plomTooltip').tooltip({delay: { show: 500, hide: 100 }})

    $('a[data-toggle="tab"]').on('shown', function (e) {
      var activated =  $(e.target).attr('href');

      $('.control').addClass('control-hidden');
      $(activated + '-control').removeClass('control-hidden');

      switch(activated){

      case '#tab-graph-forecasting':

        if(plomSettings.cst.N_DATA) {

          if(plomTs.states.length){
            plomTs.resetForecast();
          } else{
            alert('You need to run a Simulation, SMC or Kalman first !!');
            $('#graphs a[href=#tab-graph-simulation]').tab('show');
          }

        }else {
          if(plomSimul.states.length){
            plomSimul.resetForecast();
          } else {
            alert('You need to run a simulation first !!');
            $('#graphs a[href=#tab-graph-simulation]').tab('show');
          }
        }

        break;

      case '#tab-graph-simulation':

        if(plomSettings.cst.N_DATA) {
          plomTs.graph_ts.resize();
          if(plomTs.graph_drift){
            plomTs.graph_drift.resize();
          }
        } else {
          plomSimul.graph_ts.resize();
          if(plomSimul.graph_drift){
            plomSimul.graph_drift.resize();
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
          plomIc.processMsg(msg, appendLog);
        });


        if(plomSettings.cst.N_DATA) {

          socket.on('filter', function (msg) {
            plomTs.processMsg(msg, appendLog);
          });

          socket.on('simul', function (msg) {
            plomTs.processMsg(msg, appendLog);
          });

          socket.on('simplex', function (msg) {
            plomBest.processMsg(msg, appendLog);
          });

          socket.on('mcmc', function (msg) {
            plomPmcmc.processMsg(msg, appendLog);
          });

          socket.on('mif', function (msg) {
            plomMif.processMsg(msg, appendLog);
          });

          socket.on('info', function (msg) {
            appendLog(msg.msg, (msg.msg === 'err'));
          });

        } else {

          socket.on('simul', function (msg) {
            plomSimul.processMsg(msg, appendLog);
          });

        }

        socket.on('theEnd', function (msg) {

          //remove actions set with setInterval
          for(var i=0; i<plomGlobal.intervalId.length; i++){
            clearInterval(plomGlobal.intervalId.pop());
          }

          //be sure that the graph contain all the data (the graph is only updated every x msgs)
          if(plomSettings.cst.N_DATA) {

            if(plomTs.graph_drift){
              plomTs.graph_drift.updateOptions( { 'file': plomTs.data_drift } );
            }
            if(plomTs.data_ts){
              plomTs.graph_ts.updateOptions( { 'file': plomTs.data_ts } );
            }
            if(plomBest.data){
              plomBest.graph.updateOptions( { 'file': plomBest.data } );
            }
            if(plomPmcmc.data){
              plomPmcmc.graph.updateOptions( { 'file': plomPmcmc.data } );
              plomPmcmc.graph_ar.updateOptions( { 'file': plomPmcmc.data_ar } );
            }
            if(plomMif.data){
              plomMif.graph.updateOptions( { 'file': plomMif.data } );
              plomMif.graph_mif.updateOptions( { 'file': plomMif.data_mif } );
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
      (plomBest.onClickCalback())(); //sure we can do better
      $('#runSMC').trigger('click');
    });

    $("#runSMC").click(function(){
      if(plomGlobal.canRun){
        plomGlobal.canRun = false;
        $('#graphs a:first').tab('show');
        if(plomSettings.cst.N_DATA) {
          runSMC(socket, plomTs);
        } else {
          runSimul(socket, plomSimul);
        }
      }
    });

    $("#getIc").click(function(){
      if(plomGlobal.canRun){
        plomGlobal.canRun = false;
        runGetIc(socket, plomIc);
      }
    });

    $("#runSimplex").click(function(){
      if(plomGlobal.canRun){
        plomGlobal.canRun = false;
        $('#graphs a[href=#tab-graph-simplex]').tab('show');
        runSimplex(socket, plomBest);
      }
    });

    $("#runPmcmc").click(function(){
      if(plomGlobal.canRun){
        plomGlobal.canRun = false;
        $('#graphs a[href=#tab-graph-pmcmc]').tab('show');
        runPmcmc(socket, plomPmcmc);
      }
    });

    $("#runMif").click(function(){
      if(plomGlobal.canRun){
        plomGlobal.canRun = false;
        $('#graphs a[href=#tab-graph-mif]').tab('show');
        runMif(socket, plomMif);
      }
    });

    $("#set").click(function(){
      if(socket){
        socket.emit('set', theta);
      } else{
        alert("Can't connect to the websocket server");
      }
    });

    $("#runPred").click(function(){
      if(plomGlobal.canRun){
        plomGlobal.canRun = false;
        runPred(socket,(plomSettings.cst.N_DATA) ? plomTs : plomSimul);
      }
    });

    $("#resetPred").click(function(){
      if(plomSettings.cst.N_DATA) {
        plomTs.resetForecast();
      } else {
        plomSimul.resetForecast();
        plomSimul.saved_graph_updater([0,0,0,0]);
      }
    });

    ////////////////////////////////////////////////////////////////////////////////////////
    // INTERVENTION
    ////////////////////////////////////////////////////////////////////////////////////////

    var itheta = $.extend(true, {}, theta);

    //link par_proc and par_obs of itheta and theta !=intervention  so
    //that the 2 stay synchronized. Note that we do not link par_sv has they have to remain independent...
    ['par_proc', 'par_obs'].forEach(function(el){
      plomSettings['orders'][el].forEach(function(par){
        if (! ('intervention' in  theta.value[par]) && ! itheta.value[par]['intervention']) {
          itheta.value[par] = theta.value[par];
        }
      });
    });

    if(plomSettings.cst.N_DATA) {
      plomTs.itheta = itheta;
    } else{
      plomSimul.itheta = itheta;
      plomSettings.orders.par_sv.concat(plomSettings.orders.par_proc, plomSettings.orders.par_obs).forEach(function(el){
        if (('intervention' in  itheta.value[el]) && itheta.value[el]['intervention']) {
          itheta.partition[itheta.value[el]['partition_id']]['group'].forEach(function(group, i) {
            addSlider(el, group.id, itheta);
          });
        }
      });
    }

  });

});
