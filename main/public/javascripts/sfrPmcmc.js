//////////////////////////////////////////////////////////////////////////////
//SfrPmcmc
//////////////////////////////////////////////////////////////////////////////

//inherit from SfrBest
function SfrPmcmc(sfrSettings, divGraph, vizSelector, updateSfrSettings, divGraph_pmcmc_accept) {

    SfrBest.call(this, sfrSettings, divGraph, vizSelector, updateSfrSettings);

    this.data_ar = this.set_data_ar();
    this.graph_ar = this.makeGraph_ar(divGraph_pmcmc_accept);
};

SfrPmcmc.prototype = Object.create(SfrBest.prototype);
SfrPmcmc.prototype.constructor = SfrPmcmc;


SfrPmcmc.prototype.processMsg = function(msg, appendLog){

    switch(msg.flag){

    case 'log':
        appendLog(msg.msg, false);
        break;

    case 'err':
        appendLog(msg.msg, true);
        break;

    case 'pmcmc':
        this.process(msg.msg);
        break;

    case 'best':
        this.process_best(msg.msg);
        break;
    }

};

SfrPmcmc.prototype.set_data_ar = function(){
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

    this.data_ar.push(new Array(this.allParId.length+1));

    if(this.data_ar.length >= this.bufferSize){
        this.data_ar.splice(0,1);
        x = this.data_ar.length -1;
    } else {
        x = msg[0]+1;
    }

    this.data_ar[x] = msg.slice(0);
};

SfrPmcmc.prototype.makeGraph_ar = function(divGraph){

    //start with only global
    var viz = [];
    for(var i=0; i< (this.allParId.length-1); i++){
        viz.push( false );
    }
    viz.push( true );

    var labels = ["iterations"].concat(this.allParId);
    labels[labels.length-1] = 'global';

    var options={
        rollPeriod: 1,
        //	stepPlot: true,
        labels: labels,
        yLabelWidth: 50,
        customBars:false,
        axisLabelFontSize:8,
        visibility: viz,
        digitsAfterDecimal:6,
        //        animatedZooms: true,
        labelsDivStyles:{'fontSize':'8pt', 'backgroundColor': 'transparent'},
        labelsSeparateLines: true,
        showRoller: true,
        highlightCircleSize: 3,
        highlightSeriesOpts: {
            strokeWidth: 3,
            strokeBorderWidth: 1,
            highlightCircleSize: 5,
        },
        xlabel: 'iterations'};

    var g = myDygraph(divGraph, this.data_ar, options);

    var cols = d3.range(this.allParId.length).map(d3.scale.category10());
    g.updateOptions({'colors': cols});

    return g;
};
