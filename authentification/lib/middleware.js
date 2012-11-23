/*
 * middleware CSRF protection
 * Expose "token" to views
 */
exports.csrf = function (req, res, next) {
  res.locals.token = req.session._csrf;
  next();
}

/*
 * ensure that the user is logged in
 * Expose "username" (containing the username) to views
 */
exports.secure = function (req, res, next) {
  if (req.session.username) {
    res.locals.username = req.session.username;
    next();
  } else {
    res.redirect('/login?loggin_required=true&next=' + req.originalUrl.split('?')[0]);
  }
}


/*
 * expose is_logged_in to the views
 */
exports.is_logged_in = function (req, res, next) {
  res.locals.is_logged_in = (req.session.username) ? true : false;
  next();
}
