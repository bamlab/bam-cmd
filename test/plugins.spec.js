/* global describe, it, beforeEach */

var chai = require('chai');
var sinon = require('sinon');
var expect = chai.expect;

var bamCmd = require('../lib/bam-cmd.js');
var Config = require('../lib/config.js');

function newPlugin() {
  return {
    install: sinon.spy(),
    postInstall: sinon.spy(),
  };
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
        // all called
        expect(plugin1.install.calledOnce).to.be.true;
        expect(plugin2.install.calledOnce).to.be.true;
        expect(bamjs.install.calledOnce).to.be.true;

        // with args
        expect(plugin1.install.firstCall.args[0]).to.be.equals(options);
        expect(plugin2.install.firstCall.args[0]).to.be.equals(options);

        // in good order
        expect(plugin1.install.calledBefore(plugin2.install)).to.be.true;
        expect(plugin2.install.calledBefore(bamjs.install)).to.be.true;
        expect(plugin1.install.calledBefore(bamjs.install)).to.be.true;
      });
  });

  it('should launch the plugin postInstall functions in the right order', function() {
    return bamCmd.runInstall(config, options)
      .then(function() {
        // all called
        expect(plugin1.postInstall.calledOnce).to.be.true;
        expect(plugin2.postInstall.calledOnce).to.be.true;
        expect(bamjs.install.calledOnce).to.be.true;
        expect(bamjs.postInstall.calledOnce).to.be.true;

        // with args
        expect(plugin1.postInstall.firstCall.args[0]).to.be.equals(options);
        expect(plugin2.postInstall.firstCall.args[0]).to.be.equals(options);
        expect(bamjs.postInstall.firstCall.args[0]).to.be.equals(options);

        // in good order
        expect(plugin2.postInstall.calledBefore(plugin1.postInstall)).to.be.true;
        expect(bamjs.install.calledBefore(plugin2.postInstall)).to.be.true;
        expect(bamjs.install.calledBefore(plugin1.postInstall)).to.be.true;
        expect(plugin1.postInstall.calledBefore(bamjs.postInstall)).to.be.true;
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
