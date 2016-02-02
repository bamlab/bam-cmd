var chai = require('chai');
var sinon = require('sinon');
var expect = chai.expect;

var bamCmd = require('../lib/bam-cmd.js');
var Config = require('../lib/config.js');

describe('plugins', function() {

  it('should launch the plugin install function before the project one', function() {
    var plugin = {
      install: sinon.spy(),
    };
    var bamjs = {
      plugins: [
        plugin,
      ],
      install: sinon.spy(),
    };

    var config = new Config(bamjs);
    var options = {};

    return config.load().then(function() {
      return bamCmd.runInstall(config, options);
    }).then(function() {
      expect(plugin.install.called).to.be.true;
      expect(plugin.install.firstCall.args[0]).to.be.equals(options);
      expect(bamjs.install.called).to.be.true;
      expect(plugin.install.calledBefore(plugin.install.called)).to.be.true;
    });

  });

});
