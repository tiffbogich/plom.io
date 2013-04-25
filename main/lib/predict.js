var fs = require('fs')
  , ObjectID = require('mongodb').ObjectID
  , path = require('path')
  , zlib = require("zlib")
  , csv = require("csv");

module.exports = function(gfs, predictPath, files , callback){

  fs.mkdir(predictPath, function(err){

    if (err) return callback(err);

    console.log(files);

    var myFile = files.filter(function(f){return f.metadata.type === 'X';})[0]
      , readstream = gfs.createReadStream({_id: myFile._id})
      , writestream = fs.createWriteStream(path.join(predictPath, 'X_'+ myFile.metadata.trace_id +'.csv'))
      , mycsv = csv()
      , mkeep = [];

    readstream.pipe(zlib.createUnzip()).pipe(mycsv);

    mycsv
      .on('record', function(row, i){
        if( (i>0) && (parseInt(row[1], 10) === 0) ){
          mkeep.push(parseInt(row[0], 10));
        }
      })
      .to(writestream)
      .on('end', function(count){

        //keep only lines of best.csv where we have X.csv (mkeep)                          
        var myFile = files.filter(function(f){return f.metadata.type === 'best';})[0]
          , readstream = gfs.createReadStream({_id: myFile._id})
          , writestream = fs.createWriteStream(path.join(predictPath, 'predict_'+ myFile.metadata.trace_id +'.csv'))
          , mycsv = csv();

        readstream.pipe(zlib.createUnzip()).pipe(mycsv);

        mycsv
          .transform(function(row, i){
            if(i === 0 ){
              return row;
            } else if(mkeep.indexOf(parseInt(row[0], 10)) !== -1){
              return row;
            }
          })
          .to(writestream)
          .on('end', function(count){
            callback(null, count);
          })
      });

  });

}
