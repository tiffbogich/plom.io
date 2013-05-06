var fs = require('fs')
  , path = require('path')
  , async = require('async');

exports.index = function(req, res, next){

  res.format({
    html:function(){
      var components = req.app.get('components');
      components.findOne({type:'context'}, function(err, context){
        if(err) return next(err);
        res.render('model/index', {context:context});
      });

    },
    json:function(){
      //send the templates TODO browserify...
      async.parallel({ 
        reaction: function(cb) {fs.readFile(path.join(req.app.get('views'), 'model', 'tpl', 'reaction.ejs'), 'utf8', cb)},
        roption: function(cb) {fs.readFile(path.join(req.app.get('views'), 'model', 'tpl', 'reactions_options.ejs'), 'utf8', cb)},
        soption: function(cb) {fs.readFile(path.join(req.app.get('views'), 'model', 'tpl', 'states_options.ejs'), 'utf8', cb)},
        poption: function(cb) {fs.readFile(path.join(req.app.get('views'), 'model', 'tpl', 'parameters_options.ejs'), 'utf8', cb)}
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
