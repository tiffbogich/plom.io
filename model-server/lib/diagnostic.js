/**
 * diag comes from diagnostic.json produced by plom-coda
 * picts is an array of {_id, filename} generated during the commit
 */


function coda2plom(diag, picts){

  pict2id = {};
  picts.forEach(function(pict){
    pict2id[pict.filename] = pict._id;
  });

  var detail = new Array(diag.nb); //H matrix
  var summary = new Array(diag.nb); //H summary object

  for(var h=0; h<diag.nb; h++){
    detail[h] = new Array(diag.order.length);

    summary[h] = {
      geweke: true,
      raftery: {
        success: true,
        M: diag.raftery[h].resmatrix[0].M,  //max across parameters of the parameter specific burnin
        N: diag.raftery[h].resmatrix[0].N,  //max across parameters  of the required sample size
        I: diag.raftery[h].resmatrix[0].I,   //max across parameters  of the required sample size
        Nmin: diag.raftery[h].resmatrix[0].Nmin   //max across parameters  of the required sample size
      }
      heidel: true,
      essMin: diag.ess[h][diag.order[0]],
      dic: diag.dic[h]
    };


    diag.order.forEach(function(key, i){
      detail[h][i] = new Array(diag.order.length);

      var pargroup = key.split(':')
        , par = pargroup[0]
        , group = (pargroup[0] !== 'log_like') ? pargroup[1]: '';

      //fill the diagonal
      detail[h][i][i] = {
        par: par,
        group: group,
        ar: diag.ar[h][key],
        ess: diag.ess[h][key],
        geweke: diag.geweke[h].z[key], //Z score
        raftery: (diag.raftery[h].resmatrix[0] !== 'Error') ? diag.raftery[h].resmatrix[i] : {error: true, M: diag.raftery[h].resmatrix[1]},
        heidel: diag.heidel[h][i],
        trace: diag.trace[h][key],
        posterior: diag.posterior[h][key],
        png: {
          trace_id: pict2id[ ['trace', key.replace(/:/g, '-'), h].join('-') ],
          autocor_id: pict2id[ ['autocor', key.replace(/:/g, '-'), h].join('-') ]
        }
      };

      //fill extra diagonal terms
      diag.order.forEach(function(key2, j){
        var pargroup2 = key2.split(':');
        if(i!==j){
          detail[h][i][j] = {
            par: par,
            group: group,
            par2: pargroup2[0],
            group2: (pargroup2[0] !== 'log_like') ? pargroup2[1]: pargroup2[0],
            cc: diag.cross_correlation[h][i][key2]
          };
        }
      });

      //fill summary[h]
      if(detail[h][i][i].ess < summary[h].essMin) {
        summary[h].essMin = detail[h][i][i].ess;
      }

      if(detail[h][i][i].geweke <= -1.96 || detail[h][i][i].geweke >= 1.96) {
        summary[h].geweke = false;
      }

      if('error' in detail[h][i][i].raftery) {
        summary[h].raftery.success = false;
        summary[h].raftery.M = detail[h][i][i].raftery.M;
      } else {
        ['M', 'N', 'Nmin','I'].forEach(function(x){
          if(detail[h][i][i].raftery[x] > summary[h].raftery[x]) {
            summary[h].raftery[x] = detail[h][i][i].raftery[x];
          }
        });
      }

      //only focus on the stationary test (we also want no burnout)
      if(detail[h][i][i].heidel.start !== 1 || detail[h][i][i].heidel.stest !== 1) {
        summary[h].heidel = false;
      }

    });

    summary[h].passed = summary[h].geweke && summary[h].raftery.success && summary[h].heidel;

  }

  return {detail: detail, summary: summary};

}


module.exports = coda2plom;
