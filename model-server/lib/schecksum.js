var dStringify = require('./deterministicStringify')
  , crypto = require('crypto');

/**
 * Semantic checksum of a component
 */

function schecksum(component){

  var shasum = crypto.createHash('sha1');

  var s = dStringify(component,
                     function(key, value){
                       if(key === 'username' || key === 'comment' || key === 'name' || key === 'description' || key === 'doi'){
                         return undefined;
                       }
                       return value;
                     });

  shasum.update(s);

  return shasum.digest('hex');
}

module.exports = schecksum;
