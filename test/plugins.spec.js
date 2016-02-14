/* global describe, it, beforeEach */

var chai = require('chai');
var sinon = require('sinon');
var expect = chai.expect;

var _ = require('lodash');

var bamCmd = require('../lib/bam-cmd.js');
var Config = require('../lib/config.js');

function newPlugin() {
  return {
    install: sinon.spy(),
    postInstall: sinon.spy(),
  };
}

function expectCalledOnceInGoodOrder(methods) {
  var i;
  for (i=0; i < methods.length; i++) {

    var current = methods[i];

    expect(current.calledOnce).to.be.true;

    if (i !== 0) {
      var previous = methods[i - 1];
      expect(current.calledAfter(previous)).to.be.true;
    }
    if (i !== methods.length - 1) {
      var next = methods[i + 1];
      expect(current.calledBefore(next)).to.be.true;
    }
  }
}

function expectAllCalledWithParamters(methods, parameters) {
  _.forEach(methods, function(method) {
    expect(method.called).to.be.true;

    _.forEach(method.calls, function (call) {
      expect(call.args).to.be.equals(parameters);
    });
  });
}

describe('plugins', function() {

  var plugin1, plugin2;
  var bamjs, config;

  var options = {};

  beforeEach(function() {

    options = {};

    plugin1 = newPlugin();
    plugin2 = newPlugin();

    bamjs = {
      plugins: [plugin1, plugin2],
      install: sinon.spy(),
      postInstall: sinon.spy(),
    };

    config = new Config(bamjs);
    return config.load();
  });

  it('should launch the plugin install functions in the right order', function() {
    return bamCmd.runInstall(config, options)
      .then(function() {

        var callList = [
          plugin1.install,
          plugin2.install,
          bamjs.install,
          plugin2.postInstall,
          plugin1.postInstall,
          bamjs.postInstall,
        ];

        expectCalledOnceInGoodOrder(callList);
        expectAllCalledWithParamters(callList, [options]);
      });
  });

  it('should don\'t launch the plugin postInstall functions', function() {
    return bamCmd.runInstall(config, options, true)
      .then(function() {
        expect(bamjs.install.called).to.be.true;

        expect(plugin1.postInstall.called).to.be.false;
        expect(plugin2.postInstall.called).to.be.false;
        expect(bamjs.postInstall.called).to.be.false;
      });
  });
});
