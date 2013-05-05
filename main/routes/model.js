var fs = require('fs')
  , path = require('path')
  , async = require('async');

exports.index = function(req, res, next){



  res.format({
    html:function(){
      res.render('model/index');
    },
    json:function(){
      //send the templates TODO browserify...
      async.parallel({ 
        reaction: function(cb) {fs.readFile(path.join(req.app.get('views'), 'model', 'tpl', 'reaction.ejs'), 'utf8', cb)},
      }, function(err, tpl){
        if(err) return next(err);

        for(var key in tpl){
          tpl[key] = tpl[key].replace(/<%= token %>/g, req.session._csrf);
        }
        res.send(tpl);
      });
    }
  });

}
