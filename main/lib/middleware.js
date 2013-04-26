exports.exposeReqParams = function(req, res, next) {
  res.locals.params = req.params;
  next();
};
