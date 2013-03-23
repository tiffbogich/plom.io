/**
 * diag comes from diagnostic.json produced by plom-coda
 * picts is an array of {_id, filename} generated during the commit
 */

function coda2plom(diag, picts){

  pict2id = {};
  picts.forEach(function(pict){
    pict2id[pict.filename] = pict._id;
  });

  var coda = new Array(diag.nb);

  for(var h=0; h<diag.nb; h++){
    coda[h] = new Array(diag.order.length);

    diag.order.forEach(function(key, i){
      coda[h][i] = new Array(diag.order.length);

      var pargroup = key.split(':')
        , par = pargroup[0]
        , group = (pargroup[0] !== 'log_like') ? pargroup[1]: pargroup[0];

      //fill the diagonal
      coda[h][i][i] = {
        par: par,
        group: group,
        ar: diag.ar[h][key],
        ess: diag.ess[h][key],
        geweke: diag.geweke[h].z[key], //Z score
        raftery: diag.raftery[h].resmatrix[i],
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
          coda[h][i][j] = {
            par: par,
            group: group,
            par2: pargroup2[0],
            group2: (pargroup2[0] !== 'log_like') ? pargroup2[1]: pargroup2[0],
            cc: diag.cross_correlation[h][i][key2]
          };
        }
      });

    });
  }

  return coda;
}

module.exports = coda2plom;
