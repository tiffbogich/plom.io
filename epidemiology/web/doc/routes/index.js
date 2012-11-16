exports.index = function(req, res){
    res.render('index');
};

exports.modeler = {};

exports.modeler.create = function(req, res){
    res.render('modeler/create');
};

exports.modeler.play = function(req, res){
    res.render('modeler/play');
};

exports.modeler.h1n1 = function(req, res){
    res.render('modeler/h1n1');
};

exports.modeler.hfmd = function(req, res){
    res.render('modeler/hfmd');
};

exports.modeler.intro = function(req, res){
    res.render('modeler/intro');
};

exports.modeler.refs = function(req, res){
    res.render('modeler/refs');
};

