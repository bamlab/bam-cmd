
var Promise = require('bluebird');
var _ = require('lodash');

Promise.eachRight = function(collection, cb) {
  var promise = Promise.resolve();

  _.eachRight(collection, function(element, key) {
    promise = promise.then(function() {
      return cb(element, key);
    });
  });

  return promise;
};

module.exports = Promise;
