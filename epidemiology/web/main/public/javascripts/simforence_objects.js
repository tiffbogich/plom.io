//////////////////////////////////////////////////////////////////////////////
//SfrTs
//////////////////////////////////////////////////////////////////////////////
function SfrTs(sfrSettings, allDriftId, divGraph_ts, divGraph_pred, divGraph_drift, vizSelector_ts, vizSelector_pred, vizSelector_drift) {

    this.sfrSettings = sfrSettings; //just a ref
    this.allDriftId = allDriftId;

    this.N_TS = sfrSettings.cst.N_TS;
    this.N_CAC = sfrSettings.cst.N_C*sfrSettings.cst.N_AC;
    this.N_PAR_SV = sfrSettings.cst.N_PAR_SV;
    this.N_DATA = sfrSettings.cst.N_DATA;
    this.unit = this.sfrSettings.cst.FREQUENCY;
    this.ts_id = sfrSettings.orders.ts_id;

    this.dates = [];
    for(var i=0; i<sfrSettings.data.dates.length; i++){
        this.dates[i] = new Date(sfrSettings.data.dates[i]);
    }
    this.data = sfrSettings.data.data; //just a reference

    this.offsetX = 2+sfrSettings.cst.N_PAR_SV*sfrSettings.cst.N_C*sfrSettings.cst.N_AC;
    this.offsetHat = 1+sfrSettings.cst.N_PAR_SV*sfrSettings.cst.N_C*sfrSettings.cst.N_AC*3;
    this.offsetDrift = this.offsetX + this.N_TS;
    this.offsetDriftHat = this.offsetHat+ this.N_TS*3;

    this.indexDataClicked = 0;
    this.dateMsClicked = this.dates[0].getTime();

    //used to swap ts and pred
    this.hat = null; //loaded by process_hat()

    this.dataRef = null;
    this.graphRef = null;
    this.processXRef = null;

    this.data_ts = this.set_data_ts();
    this.data_pred = [];

    this.graph_ts = this.makeGraph(divGraph_ts, vizSelector_ts);
    this.graph_pred = this.makeGraph(divGraph_pred, vizSelector_pred);

    //only defined if the model contains drift
    if(this.allDriftId.length){
        this.data_drift = this.set_data_drift();
        this.graph_drift = this.makeGraphDrift(divGraph_drift, vizSelector_drift);
    } else {
        this.data_drift = null;
        this.graph_drift = null;
    }

};

SfrTs.prototype.use_ts = function(){
    this.dataRef = this.data_ts;
    this.graphRef = this.graph_ts;
    this.processXRef = this.process_X;
};

SfrTs.prototype.use_pred = function(){
    this.dataRef = this.data_pred;
    this.graphRef = this.graph_pred;
    this.processXRef = this.process_pred;
};

SfrTs.prototype.use_ic = function(){
    this.processXRef = this.getIc;
};


SfrTs.prototype.getIc = function(msgX){
    //get IC obtained after skipping transiant. Note that X are averaged to respect grouping

    var X = msgX[0].slice(2, 2+this.N_PAR_SV*this.N_CAC);

    if(this.sfrSettings.data.par_fixed_values.hasOwnProperty('p_t')){
        var pop_size_t = this.sfrSettings.data.par_fixed_values.p_t[this.sfrSettings.data.par_fixed_values.p_t.length-1];
    } else if(this.sfrSettings.POP_SIZE_EQ_SUM_SV){

        var pop_size_t = [];

        for(var cac=0; cac< this.N_CAC; cac++){
            var sum_sv = 0.0;
            for(var p=0; p< this.N_PAR_SV; p++){
                sum_sv += this.X[p*this.N_CAC+cac];
            }
            pop_size_t.push(sum_sv);
        }
    } else {
        var pop_size_t = this.sfrSettings.data.pop_sizes;
    }

    var that = this;
    var offset = 0;

    this.sfrSettings.orders.state_var.forEach(function(par, i, a){

        //we are going to use an average filter to compute the average of X per group. x_n_bar = (x_n - x_n-1_bar)/ n where n will be offsets
        var offsets = [];
        var ngroups = Math.max.apply( Math, that.sfrSettings.parameters.par_sv_values[par]['grouping'] )+1;
        for(var g=0; g< ngroups ; g++){
            offsets.push(0.0);
        }

        for(var g=0; g< that.sfrSettings.parameters.par_sv_values[par]['guess'].length ; g++){
            that.sfrSettings.parameters.par_sv_values[par]['guess'][g] = 0.0;
        }

        for(var cac=0; cac< that.N_CAC; cac++){
            offsets[ that.sfrSettings.parameters.par_sv_values[par]['grouping'][cac] ] +=1.0;
            var myGroup =  that.sfrSettings.parameters.par_sv_values[par]['grouping'][cac];
            that.sfrSettings.parameters.par_sv_values[par]['guess'][ myGroup ] += (X[offset] / pop_size_t[cac] - that.sfrSettings.parameters.par_sv_values[par]['guess'][ myGroup ]) / offsets[ myGroup ]  ;
            offset++;
        }

        //sanitize and write into the HTML parameters table...
        for(var g=0; g< that.sfrSettings.parameters.par_sv_values[par]['guess'].length ; g++){

            $('input.parameters[name= "guess___par_sv___'  + par+ '___' + g +'"]').val(that.sfrSettings.parameters.par_sv_values[par]['guess'][g]);

            if(that.sfrSettings.parameters.par_sv_values[par]['guess'][g] < that.sfrSettings.parameters.par_sv_values[par]['min'][g]){
                that.sfrSettings.parameters.par_sv_values[par]['min'][g] = that.sfrSettings.parameters.par_sv_values[par]['guess'][g];
                $('input.parameters[name= "min___par_sv___'  + par+ '___' + g +'"]').val(that.sfrSettings.parameters.par_sv_values[par]['min'][g]);
            }
            if(that.sfrSettings.parameters.par_sv_values[par]['guess'][g] > that.sfrSettings.parameters.par_sv_values[par]['max'][g]){
                that.sfrSettings.parameters.par_sv_values[par]['max'][g] = that.sfrSettings.parameters.par_sv_values[par]['guess'][g];
                $('input.parameters[name= "max___par_sv___'  + par+ '___' + g +'"]').val(that.sfrSettings.parameters.par_sv_values[par]['max'][g]);
            }
            if(that.sfrSettings.parameters.par_sv_values[par]['jump_size'][g] > that.sfrSettings.parameters.par_sv_values[par]['guess'][g]){
                that.sfrSettings.parameters.par_sv_values[par]['jump_size'][g] = that.sfrSettings.parameters.par_sv_values[par]['guess'][g];
                $('input.parameters[name= "jump_size___par_sv___'  + par+ '___' + g +'"]').val(that.sfrSettings.parameters.par_sv_values[par]['jump_size'][g]);
            }
        }
        //redraw slider
        $('select.grouping[name="group___guess___par_sv___' + par+'"]').trigger('change');
        $('select.grouping[name="group___jump_size___par_sv___' + '___' + par+'"]').trigger('change');

    });

};


SfrTs.prototype.makeSettingsPred = function(){
//extend grouping, place hat values in guess and transform pop size into proportion...

    var settingsPred = $.extend(true, {}, this.sfrSettings); //deepcopy

    if(this.sfrSettings.data.par_fixed_values.hasOwnProperty('p_t')){
        var pop_size_t = this.sfrSettings.data.par_fixed_values.p_t[this.indexDataClicked];
    } else if(this.sfrSettings.POP_SIZE_EQ_SUM_SV){

        var pop_size_t = [];

        for(var cac=0; cac< this.N_CAC; cac++){
            var sum_sv = 0.0;
            for(var p=0; p< this.N_PAR_SV; p++){
                sum_sv += this.hat[this.indexDataClicked][p*this.N_CAC+cac];
            }
            pop_size_t.push(sum_sv);
        }

    } else {
        var pop_size_t = this.sfrSettings.data.pop_sizes;
    }

    var that = this;
    var offset = 0;
    this.sfrSettings.orders.state_var.forEach(function(par, i, a){
        var pmin = Math.min.apply( Math, that.sfrSettings.parameters.par_sv_values[par]['min'] );
        var pmax = Math.max.apply( Math, that.sfrSettings.parameters.par_sv_values[par]['max'] );
        var pjump = Math.min.apply( Math, that.sfrSettings.parameters.par_sv_values[par]['jump_size'] );

        settingsPred.parameters.par_sv_values[par]['guess'] = new Array(that.N_CAC);
        settingsPred.parameters.par_sv_values[par]['grouping'] = new Array(that.N_CAC);
        settingsPred.parameters.par_sv_values[par]['min'] = new Array(that.N_CAC);
        settingsPred.parameters.par_sv_values[par]['max'] = new Array(that.N_CAC);
        settingsPred.parameters.par_sv_values[par]['jump'] = new Array(that.N_CAC);

        for(var cac=0; cac< that.N_CAC; cac++){
            settingsPred.parameters.par_sv_values[par]['guess'][cac] = that.hat[that.indexDataClicked][offset]/pop_size_t[cac];

            settingsPred.parameters.par_sv_values[par]['grouping'][cac] = cac;
            settingsPred.parameters.par_sv_values[par]['min'][cac] = pmin;
            settingsPred.parameters.par_sv_values[par]['max'][cac] = pmax;
            settingsPred.parameters.par_sv_values[par]['jump_size'][cac] = pjump;
            offset++;
        }
    });

    return settingsPred;
};


SfrTs.prototype.makeGraph = function(divGraph, vizSelector){
    //vizSelector should be 'input.plottedTs'

    var viz = [];
    $(vizSelector).each(function(){
        viz.push( ($(this).attr('checked')) );
    });

    for(var i=0; i<this.N_TS; i++){
        viz.push(viz[i]);
    }

    var dataLabels = [];
    for(var i=0; i<this.N_TS; i++){
        dataLabels.push('data'+this.ts_id[i]);
    }
    var fullLabels = ["time"].concat(dataLabels, this.ts_id);

    var options={
        rollPeriod: 1,
//	stepPlot: true,
        labels: fullLabels,
        yLabelWidth: 50,
        customBars:true,
        axisLabelFontSize:8,
        visibility: viz,
        digitsAfterDecimal:6,
        labelsDivWidth: 400,
        labelsDivStyles:{'fontSize':'8pt', 'backgroundColor': 'transparent', 'marginTop':'10px'},
        labelsSeparateLines: true,
        showRoller: true,
        highlightCircleSize: 3,
        highlightSeriesOpts: {
            strokeWidth: 3,
            strokeBorderWidth: 1,
            highlightCircleSize: 5,
        }
    };

    for(var i=0; i<this.N_TS; i++){
        options[fullLabels[i+1]] = {strokePattern: Dygraph.DOT_DASH_LINE};
    }

    if(divGraph === 'graphPred'){
        var that = this;
        options['clickCallback']= function(e, x, pts) {
            that.dateMsClicked = x;
            //if user select a date when no data are availabe (and hence no reconstructed IC), we reset his selection to the last possible value
            var lastPossibleDate = that.dates[that.dates.length-1].getTime();
            if(that.dateMsClicked > lastPossibleDate){
                that.dateMsClicked = lastPossibleDate;
                x = lastPossibleDate;
            }
            var d = new Date(x);
            $('input[name=t0]').val(d.toDateString());

            that.graph_pred.updateOptions( { 'underlayCallback': function(canvas, area, g) { //add a vertical line...
                var loc = g.toDomCoords(that.dateMsClicked, 0); //get the position in the canvas of the point (dateMsClicked,0)
                // The drawing area doesn't start at (0, 0), it starts at (area.x, area.y).
                canvas.fillStyle = "rgba(107, 174, 214, 0.2)";
                canvas.fillRect(area.x, area.y, loc[0]-area.x, area.h);

                canvas.fillStyle = "rgba(238, 238, 238, 0.1)";
                canvas.fillRect(loc[0], area.y, area.w, area.h);
            }});
        };
    }


    var g = new Dygraph(document.getElementById(divGraph),
                        this.data_ts,
                        options
                       );
    //repeat colors so that data and simul have the same colors
    cols = g.getColors();
    g.updateOptions({'colors': cols.concat(cols)});
    return g;
};


SfrTs.prototype.makeGraphDrift = function(divGraph, vizSelector){
    //vizSelector should be 'input.plottedTs'

    var viz = [];
    $(vizSelector).each(function(){
        viz.push( ($(this).attr('checked')) );
    });

    var options={
        rollPeriod: 1,
//	stepPlot: true,
        labels: ["time"].concat(this.allDriftId),
        yLabelWidth: 50,
        customBars:true,
        axisLabelFontSize:8,
        visibility: viz,
        digitsAfterDecimal:6,
        labelsDivWidth: 400,
        labelsDivStyles:{'fontSize':'8pt', 'backgroundColor': 'transparent', 'marginTop':'10px'},
        labelsSeparateLines: true,
        showRoller: true,
        highlightCircleSize: 3,
        highlightSeriesOpts: {
            strokeWidth: 3,
            strokeBorderWidth: 1,
            highlightCircleSize: 5,
        }
    };

    var g = new Dygraph(document.getElementById(divGraph),
                        this.data_drift,
                        options
                       );

    return g;
};




SfrTs.prototype.set_data_ts = function(){
    //get the time series data. Data are repeated 3 times to allow for custom error bars:
    //simulation (X) and (hat) will fill the null values

    var data = [];
    for(var i=0; i<this.N_DATA; i++){
        data.push(new Array(1+this.N_TS*2));
        for(var ts=0; ts<(this.N_TS*2); ts++){
            data[i][ts+1] = new Array(3);
        };
    }


    for(var i=0; i<this.N_DATA; i++){
        data[i][0] = this.dates[i];
        for(var ts=0; ts<this.N_TS; ts++){
            for(var j=0; j<3; j++){
                data[i][ts+1][j] = this.data[i][ts];
                data[i][this.N_TS+ts+1][j] = null;
            }
        }
    }

    return data;
};


SfrTs.prototype.set_data_drift = function(){
    //get the time series data. Data are repeated 3 times to allow for custom error bars:
    //simulation (X) and (hat) will fill the null values

    var data = [];

    for(var i=0; i<this.N_DATA; i++){
        data.push(new Array(1+(this.allDriftId.length)));
        data[i][0] = this.dates[i];
        for(var j=0; j<((this.allDriftId.length)); j++){
            data[i][1+j] = new Array(3);
        };
    }

    return data;
};


SfrTs.prototype.setAndGet_indexDataClicked = function(){
    //find t0
    this.indexDataClicked = 0;
    while((this.dateMsClicked !== this.dates[this.indexDataClicked].getTime()) && (this.indexDataClicked < this.N_DATA)){ this.indexDataClicked++ };

    return this.indexDataClicked;
}

SfrTs.prototype.set_data_pred = function(extraLength){
    //copy data_ts, add future dates if needed and add null for the future steps so that simul can write it's trajectory inside
    //values are repeated 3 times to allow for custom error bars:

    var increments = {'D': 60*60*24*1000}; //quantity to add to increment a day in millisecond
    increments['W'] = increments['D']*7;
    increments['M'] = increments['D']*30;
    increments['Y'] = increments['D']*365;

    var data = $.extend(true, [], this.data_ts); //deepcopy

    //extend array;
    var lastDataTimeMs = data[data.length-1][0].getTime();
    var inc = increments[this.unit];

    for (var i=0; i<= extraLength; i++){

        //new ref
        data.push(new Array(1+this.N_TS*2));
        for(var ts=0; ts<(this.N_TS*2); ts++){
            data[this.N_DATA+i][ts+1] = new Array(3);
        };

        //initialize with future dates and null
        data[this.N_DATA+i][0] = new Date(lastDataTimeMs +(i+1)*inc);
        for(var ts=0; ts<this.N_TS; ts++){
            for(var j=0; j<3; j++){
                data[this.N_DATA+i][ts+1][j] = null;
                data[this.N_DATA+i][this.N_TS+ts+1][j] = null;
            }
        }
    }

    return data;
};

SfrTs.prototype.process_hat = function(msg){
    //process an hat message and load this.hat

    var lp =this.N_PAR_SV*this.N_CAC;
    this.hat = [];
    for(var t=0, l=msg.length; t<l; t++){
        this.hat.push(new Array(lp));

        //ts
        for(var ts=0; ts<this.N_TS; ts++){
            for(var j=0; j<3; j++){
                this.data_ts[t][this.N_TS+1+ts][j] = msg[t][this.offsetHat+ts*3+j];
            }
        }
        //drift (if it exists)
        for(var i=0; i<this.allDriftId.length; i++){
            for(var j=0; j<3; j++){
                this.data_drift[t][1+i][j] = msg[t][this.offsetDriftHat+i*3+j];
            }
        }

        for(var p=0; p<lp; p++){
            this.hat[t][p] = msg[t][2+p*3];
        }
    }

};

SfrTs.prototype.process_X = function(msg){
    //take an X msg and fill a hat data

    //ts
    for(var ts=0; ts<this.N_TS; ts++){
        for(var j=0; j<3; j++){
            this.data_ts[msg[0][1]-1][this.N_TS+ts+1][j] = msg[0][this.offsetX+ts];
        }
    }
    //drift (if it exists)
    for(var i=0; i<this.allDriftId.length; i++){
        for(var j=0; j<3; j++){
            this.data_drift[msg[0][1]-1][1+i][j] = msg[0][this.offsetDrift+i];
        }
    }

};

SfrTs.prototype.process_pred = function(msg){
    //take an X msg and fill a hat data

    for(var ts=0; ts<this.N_TS; ts++){
        this.data_pred[msg[0][1]][this.N_TS+ts+1][1] = msg[0][this.offsetX+ts];
    }

};




//////////////////////////////////////////////////////////////////////////////
//SfrBest
//////////////////////////////////////////////////////////////////////////////
function SfrBest(sfrSettings, allParId, divGraph_simplex, divGraph_mif, divGraph_pmcmc, vizSelector_simplex, vizSelector_mif, vizSelector_pmcmc) {
    //to be improved: Best.prototype.makeGraph depends on things not defined in this file...

    this.bufferSize = 100;
    this.sfrSettings = sfrSettings; //just a ref
    this.allParId = allParId;

    this.data_simplex = this.set_data();
    this.data_mif = this.set_data();
    this.data_pmcmc = this.set_data();

    this.graph_simplex = this.makeGraph(divGraph_simplex, vizSelector_simplex, 'simplex');
    this.graph_mif = this.makeGraph(divGraph_mif, vizSelector_mif, 'mif');
    this.graph_pmcmc = this.makeGraph(divGraph_pmcmc, vizSelector_pmcmc, 'pmcmc');

    this.dataRef = null;
    this.graphRef = null;

};

SfrBest.prototype.use_simplex = function(){
    this.dataRef = this.data_simplex;
    this.graphRef = this.graph_simplex;
};

SfrBest.prototype.use_mif = function(){
    this.dataRef = this.data_mif;
    this.graphRef = this.graph_mif;
};

SfrBest.prototype.use_pmcmc = function(){
    this.dataRef = this.data_pmcmc;
    this.graphRef = this.graph_pmcmc;
};


SfrBest.prototype.set_data = function(){
    //will contain the parameter values as a function of number of iterations:
    var data = [];
    data.push(new Array(this.allParId.length+1));
    for(var i=0; i< (this.allParId.length+1); i++){
        data[0][i] = null;
    }

    return data;
};

SfrBest.prototype.process_best = function(msg){
    var x;

    this.dataRef.push(new Array(this.allParId.length+1));

    if(this.dataRef.length >= this.bufferSize){
        this.dataRef.splice(0,1);
        x = this.dataRef.length -1;
    } else {
        x = msg[0]+1;
    }

    this.dataRef[x] = msg.slice(0);//[msg[0], msg[msg.length-1]];

};

SfrBest.prototype.makeGraph = function(divGraph, vizSelector, myMethod){
//vizSelector should be 'input.plottedPar'


    var viz = [];
    $(vizSelector).each(function(){
        viz.push( ($(this).attr('checked')) );
    });

    var options={
        rollPeriod: 1,
        //	stepPlot: true,
        labels: ["iterations"].concat(this.allParId),
        yLabelWidth: 50,
        customBars:false,
        axisLabelFontSize:8,
        visibility: viz,
        digitsAfterDecimal:6,
        labelsDivWidth: 400,
        labelsDivStyles:{'fontSize':'6pt', 'backgroundColor': 'transparent', 'marginTop':'0px'},
        labelsSeparateLines: true,
        showRoller: true,
        highlightCircleSize: 3,
        highlightSeriesOpts: {
            strokeWidth: 3,
            strokeBorderWidth: 1,
            highlightCircleSize: 5,
        },
        xlabel: 'iterations'};


    var that = this;
    options['clickCallback']= function(e, x, pts) {
        //put values of best in parameters (DOM) and sfrSettings

        switch(myMethod){
        case 'simplex':
            var mydata = that.data_simplex;
            break;
        case 'mif':
            var mydata = that.data_mif;
            break;
        case 'pmcmc':
            var mydata = that.data_pmcmc;
            break;
        }

        var xx = x % that.bufferSize;
        xx = (xx < mydata.length) ? xx : xx-1;

        var $this;
        //we need to map x [1, M] into [ 0, this.bufferSize ]
        for(var i=0; i< that.allParId.length-1; i++){
            $this = $('input#ordered_id___'+i);
            $this.val(mydata[ xx ][i+1]);
            updateSfrSettingsAndSliders(that.sfrSettings, $this);
        }
    };


    switch(myMethod){
    case 'simplex':
        var data = this.data_simplex;
        break;
    case 'mif':
        var data = this.data_mif;
        break;
    case 'pmcmc':
        var data = this.data_pmcmc;
        break;
    }

    var g = new Dygraph(document.getElementById(divGraph),
                        data,
                        options
                       );
    return g;
};


//////////////////////////////////////////////////////////////////////////////
//SfrMif
//////////////////////////////////////////////////////////////////////////////
function SfrMif(sfrSettings, divGraph_mif_within) {

    this.sfrSettings = sfrSettings; //just a ref


    var allParName = [];
    var allParType = [];
    for(var i=0; i< sfrSettings.orders['par_proc'].length; i++){
        allParName.push(sfrSettings.orders['par_proc'][i]);
        allParType.push('par_proc');
    }
    for(var i=0; i< sfrSettings.orders['par_obs'].length; i++){
        allParName.push(sfrSettings.orders['par_obs'][i]);
        allParType.push('par_obs');
    }

    this.allParId = [];
    for(var i=0; i< sfrSettings.iterators.par_proc_par_obs_no_drift.ind.length; i++){
        var ind = sfrSettings.iterators.par_proc_par_obs_no_drift.ind[i]-sfrSettings.cst.N_PAR_SV;
        var gmax = Math.max.apply( Math, sfrSettings.parameters[ allParType[ind] + '_values' ][ allParName[ind] ][ 'grouping' ] ) + 1;
        for(var g=0; g < gmax; g++){
            this.allParId.push([allParType[ind], allParName[ind], g].join('__'));
        }
    }
    this.allParId.push('ess');

    this.N_THETA_MIF = this.allParId.length-1;


    this.N_CAC = sfrSettings.cst.N_C*sfrSettings.cst.N_AC;
    this.N_DATA = sfrSettings.cst.N_DATA;
    this.unit = this.sfrSettings.cst.FREQUENCY;

    this.dates = [];
    for(var i=0; i<sfrSettings.data.dates.length; i++){
        this.dates[i] = new Date(sfrSettings.data.dates[i]);
    }


    this.data = this.set_data();
    this.graph = this.makeGraph(divGraph_mif_within);
};


SfrMif.prototype.makeGraph = function(divGraph){

    //start with only ess visible
    var viz = [];
    for(var i=0; i<this.N_THETA_MIF; i++){
        viz.push( false );
    }
    viz.push(true);

    var options={
        rollPeriod: 1,
        //	stepPlot: true,
        labels: ["iterations"].concat(this.allParId),
        yLabelWidth: 50,
        errorBars:true,
        axisLabelFontSize:8,
        visibility: viz,
        digitsAfterDecimal:6,
        labelsDivWidth: 400,
        labelsDivStyles:{'fontSize':'8pt', 'backgroundColor': 'transparent', 'marginTop':'10px'},
        labelsSeparateLines: true,
        showRoller: true,
        highlightCircleSize: 3,
        highlightSeriesOpts: {
            strokeWidth: 3,
            strokeBorderWidth: 1,
            highlightCircleSize: 5,
        }
    };

    var g = new Dygraph(document.getElementById(divGraph),
                        this.data,
                        options
                       );
    return g;
};

SfrMif.prototype.set_data = function(){
    //get the MIF data. Data are repeated 2 times to allow for error bars:

    var data = [];
    for(var i=0; i<this.N_DATA; i++){
        data.push(new Array(1+(this.allParId.length)));
        data[i][0] = this.dates[i];
        for(var j=0; j<((this.allParId.length)); j++){
            data[i][1+j] = new Array(2);
        };
    }

    return data;
};


SfrMif.prototype.process = function(msg){
    //process a mif message

    var x = msg[1]-1;

    if(x === 0){ //reset graph every m iteration
        this.data = this.set_data()
    };

    for(var i=0; i<this.N_THETA_MIF; i++){
        this.data[x][i+1][0] = msg[2+i*2];
        this.data[x][i+1][1] = msg[3+i*2];
    }
    this.data[x][1+this.N_THETA_MIF][0] = msg[2+this.N_THETA_MIF*2];
    this.data[x][1+this.N_THETA_MIF][1] = 0.0;

    if(x === (this.N_DATA-1)){
        this.graph.updateOptions( { 'file': this.data } );
    };
};



//////////////////////////////////////////////////////////////////////////////
//SfrPmcmc
//////////////////////////////////////////////////////////////////////////////
function SfrPmcmc(sfrSettings, allParId, divGraph_pmcmc_accept) {

    this.bufferSize = 100;

    this.sfrSettings = sfrSettings; //just a ref

    this.allParId = allParId.slice(0, allParId.length);
    this.allParId[allParId.length-1] = 'global';

    this.data = this.set_data();
    this.graph = this.makeGraph(divGraph_pmcmc_accept);
};


SfrPmcmc.prototype.set_data = function(){
    //will contain the parameter values as a function of number of iterations:
    var data = [];
    data.push(new Array(this.allParId.length+1));
    for(var i=0; i< (this.allParId.length+1); i++){
        data[0][i] = null;
    }

    return data;
};


SfrPmcmc.prototype.process = function(msg){
    var x;

    this.data.push(new Array(this.allParId.length+1));

    if(this.data.length >= this.bufferSize){
        this.data.splice(0,1);
        x = this.data.length -1;
    } else {
        x = msg[0]+1;
    }

    this.data[x] = msg.slice(0);
};


SfrPmcmc.prototype.makeGraph = function(divGraph){

    //start with only global
    var viz = [];
    for(var i=0; i< (this.allParId.length-1); i++){
        viz.push( false );
    }
    viz.push( true );

    var options={
        rollPeriod: 1,
        //	stepPlot: true,
        labels: ["iterations"].concat(this.allParId),
        yLabelWidth: 50,
        customBars:false,
        axisLabelFontSize:8,
        visibility: viz,
        digitsAfterDecimal:6,
        labelsDivWidth: 400,
        labelsDivStyles:{'fontSize':'8pt', 'backgroundColor': 'transparent', 'marginTop':'10px'},
        labelsSeparateLines: true,
        showRoller: true,
        highlightCircleSize: 3,
        highlightSeriesOpts: {
            strokeWidth: 3,
            strokeBorderWidth: 1,
            highlightCircleSize: 5,
        },
        xlabel: 'iterations'};


    var g = new Dygraph(document.getElementById(divGraph),
                        this.data,
                        options
                       );
    return g;
};
