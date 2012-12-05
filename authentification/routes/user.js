var bcrypt = require('bcrypt')
  , Validator = require('validator').Validator;

Validator.prototype.error = function (msg) {
  this._errors.push(msg);
  return this;
}

Validator.prototype.getErrors = function () {
  return (this._errors.length) ? this._errors : null;
}


exports.login = function(req, res) {
  console.log(req.query.next);

  res.render('login', {username: req.query.username,
                       loggin_required: req.query.loggin_required,
                       next: req.query.next});
};


exports.logout = function(req, res) {
  req.session.username = null;
  res.redirect('/');
};


exports.login_post = function(req, res, next) {

  var me = req.body.user;
  var users = req.app.get('users');

  users.findOne({_id: me._id}, function(err, doc){

    if (err) return next(err);

    if(doc) {

      bcrypt.compare(me.password, doc.hash, function(err, is_identical) {
        if (err) return next(err);

        if (is_identical) {
          req.session.username = doc._id;
          res.redirect(req.body.next || '/success');
        } else {
          res.render('login', {fail: 'invalid password or username'});
        }
      });

    } else {
      res.render('login', {fail: 'user not found'});
    }

  });

};


exports.register = function(req, res) {
  res.render("register");
};


exports.register_post = function(req, res) {

  var me = req.body.user;

  var v = new Validator();

  v.check(me._id, "Username has to be alphanumeric").isAlphanumeric();
  v.check(me.email, 'Invalid email').isEmail();
  v.check(me.password, 'Password has to contain at least 3 characters').len(3);

  var errors = v.getErrors();
  if (errors){
    console.log('error', errors);
    res.render('register', {'validation': errors.join(' ; ')})
    return;
  }

  bcrypt.genSalt(10, function(err, salt) {
    if (err) return next(err);
    bcrypt.hash(me.password, salt, function(err, hash) {
      if (err) return next(err);

      // Store hash and salt in DB.
      var users = req.app.get('users');
      users.insert({_id:me._id, hash:hash, email: me.email}, function(err, objs) {

        if (err) {

          if (err.code == 11000) {
            res.render('register', {fail: 'Username already taken', me: me});
          } else {
            return next(err);
          }

        } else {
          res.redirect('/login?username=' + me._id);
        }

      });

    });
  });

};
