var parse = require('plom-parser')
  , async = require('async')
  , fs = require('fs')
  , path = require('path')
  , ObjectID = require('mongodb').ObjectID;


exports.index = function(req, res, next){

  res.format({
    html:function(){
      res.render('context/index');
    },
    json:function(){
      //send the templates TODO browserify...
      async.parallel({ 
        pop: function(cb) {fs.readFile(path.join(req.app.get('views'), 'context', 'tpl', 'pop.ejs'), 'utf8', cb)},
        ts: function(cb) {fs.readFile(path.join(req.app.get('views'), 'context', 'tpl', 'ts.ejs'), 'utf8', cb)},
      }, function(err, tpl){
        if(err) return next(err);

        for(var key in tpl){
          tpl[key] = tpl[key].replace(/<%= token %>/g, req.session._csrf);
        }

        res.send(tpl);
      });
    }
  });

};



exports.upload = function(req, res, next){

  var dPath, l;

  if('data' in req.files){
    dPath = req.files.data.path;
    l = 3;
  } else if ('metadata' in req.files){
    dPath = req.files.metadata.path;
    l = 2;
  } else {
    return next(new Error('invalid upload'));
  }

  parse.data(fs.createReadStream(dPath), l, function(err, data){
    res.send({err: err && err.toString(), data:data, path: dPath});
  });

};


exports.commit = function(req, res, next){

  console.log(req.body);
  res.send(req.body);

}
