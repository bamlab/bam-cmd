
var _ = require('lodash');
var run = require('./run');

function Callable(object, method, args) {

  if (! (this instanceof Callable)) {
    return new Callable(object, method, args);
  }

  this.object = object;
  this.method = method;
  this.args = args;
}


Callable.prototype.call = function() {
  if (! this.exists()) {
    throw Error('method ' + this.method + ' does not exists');
  }

  if (_.isString(this.object[this.method])) {
    return run('/bin/sh', [ '-c', this.object[this.method]]);
  }

  return this.object[this.method].apply(this.object, this.args);
};

Callable.prototype.exists = function() {
  return _.hasIn(this.object, this.method);
};

module.exports = Callable;
