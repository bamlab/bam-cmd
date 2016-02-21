/* global describe, it, before, after */

var chai = require('chai');
var sinon = require('sinon');
var expect = chai.expect;
var Command = require('../lib/commands');
var bamCmd = require('../lib/bam-cmd');
var Promise = require('bluebird');

var defaultCommand = new Command({
  configPath: __dirname + '/fixtures/bam-default.js',
});

function resolveFunc() {
  return Promise.resolve();
}

describe('commands', function() {

  before(function() {
    sinon.stub(process, 'exit');
  });

  after(function() {
    process.exit.restore();
  });

  it('should get the package version', function() {
    var command = new Command();
    expect(command.getVersion()).to.be.equals('0.1.0');
  });

  it('should load the config file', function() {
    var expectedConfig = require('./fixtures/bam-default');
    return defaultCommand.loadConfig()
      .then(function(config) {
        expect(config.config.version).to.be.equals(expectedConfig.version);
      });
  });

  it('should be able to load the config from object', function() {
    var expectedConfig = require('./fixtures/bam-default');
    var command = new Command({}, null, expectedConfig);
    return command.loadConfig()
      .then(function(config) {
        expect(config.config).to.be.equals(expectedConfig);
      });
  });

  it('should load default config if nothing provided', function() {
    sinon.stub(bamCmd, 'loadConfig');
    bamCmd.loadConfig.returns(Promise.resolve());

    var command = new Command({});
    return command.loadConfig()
      .then(function() {
        expect(bamCmd.loadConfig.called).to.be.true;
        expect(bamCmd.loadConfig.getCall(0).args.length).to.be.equal(0);
        bamCmd.loadConfig.restore();
      });
  });


  it('should load build options', function() {
    return defaultCommand.getBuildOptions(['node', 'cmd', '-e', 'prod'])
      .then(function(options) {
        expect(options.env).to.be.equals('prod');
      });
  });

  it('should have staging as default env', function() {
    return defaultCommand.getBuildOptions(['node', 'cmd'])
      .then(function(options) {
        expect(options.env).to.be.equals('staging');
      });
  });

  it('should run the deploy function', function() {
    var command = new Command(undefined, [], {});
    var option = {foo: Math.random()};
    var config = {launch: sinon.spy(resolveFunc)};

    return command.runDeploy(option, config)
      .then(function() {
        expect(config.launch.calledWith('deploy', option), 'launch deploy called with good params').to.be.true;
      });
  });

  it('should call the build function with the options', function() {
    var commands = new Command();
    var option = {foo: Math.random()};
    var args = ['node', 'bam-build'];
    var config = {
      launch: sinon.spy(resolveFunc),
    };

    sinon.stub(commands, 'loadConfig').returns(Promise.resolve(config));
    sinon.stub(commands, 'getOptions').returns(Promise.resolve(option));

    return commands.build(args)
      .then(function() {
        expect(config.launch.calledWith('build', option), 'launch build called with good params').to.be.true;
        expect(commands.getOptions.calledWith('build', args), 'getOptions build called with good params').to.be.true;
      });
  });

  it('should deploy and build', function() {
    var commands = new Command();
    var option = {build: true};
    var args = ['node', 'bam-build'];

    var config = {
      launch: sinon.spy(resolveFunc),
    };

    sinon.stub(commands, 'loadConfig').returns(Promise.resolve(config));
    sinon.stub(commands, 'getOptions').returns(Promise.resolve(option));

    return commands.deploy(args)
      .then(function() {
        expect(config.launch.calledWith('build', option), 'launch build called with good params').to.be.true;
        expect(config.launch.calledWith('deploy', option), 'launch deploy called with good params').to.be.true;
        expect(commands.getOptions.calledWith('deploy', args), 'getOptions build called with good params').to.be.true;
      });
  });

  it('should deploy only', function() {
    var commands = new Command();
    var option = {build: false};
    var args = ['node', 'bam-build'];

    var config = {
      launch: sinon.spy(resolveFunc),
    };

    sinon.stub(commands, 'loadConfig').returns(Promise.resolve(config));
    sinon.stub(commands, 'getOptions').returns(Promise.resolve(option));

    return commands.deploy(args)
      .then(function() {
        expect(config.launch.calledWith('build', option), 'launch build called with good params').to.be.false;
        expect(config.launch.calledWith('deploy', option), 'launch deploy called with good params').to.be.true;
        expect(commands.getOptions.calledWith('deploy', args), 'getOptions build called with good params').to.be.true;
      });
  });

  it('should catch build errors', function() {
    var command = new Command({}, [], {
      build: function() {return Promise.reject();},
    });
    return command.build();
  });

  it('should catch deploy errors', function() {
    var command = new Command({}, [], {
      deploy: function() {return Promise.reject();},
    });
    return command.deploy();
  });

  it('should catch install errors', function() {
    var command = new Command({}, [], {
      install: function() {return Promise.reject();},
    });
    return command.install();
  });

  it('should get install options', function() {
    return defaultCommand.getInstallOptions(['node', 'cmd', '-s'])
      .then(function(options) {
        expect(options.setup).to.be.true;
      });
  });

  it('should run install options and scripts', function() {
    var commands = new Command();
    var args = ['node', 'bam-run-install'];
    var config = {
      launch: sinon.spy(resolveFunc),
      getOptions: sinon.spy(resolveFunc),
    };

    sinon.stub(commands, 'loadConfig').returns(Promise.resolve(config));
    sinon.stub(commands, 'runInstall');

    return commands.install(args)
      .then(function() {
        expect(commands.runInstall.called, 'runInstall called').to.be.true;
      });
  });

  it('should not do all the setup in the runInstall command', function() {
    sinon.stub(bamCmd, 'setupProject').returns(Promise.resolve());
    sinon.stub(bamCmd, 'runInstall').returns(Promise.resolve());
    var command = new Command({}, []);
    return command.runInstall({setup: false}).then(function() {
      expect(bamCmd.runInstall.called).to.be.true;
      expect(bamCmd.setupProject.called).to.be.false;
      bamCmd.setupProject.restore();
      bamCmd.runInstall.restore();
    });
  });

  it('should do all the setup in the runInstall command', function() {
    sinon.stub(bamCmd, 'setupProject').returns(Promise.resolve());
    sinon.stub(bamCmd, 'runInstall').returns(Promise.resolve());

    var command = new Command({}, []);
    return command.runInstall({setup: true}).then(function() {
      expect(bamCmd.runInstall.called).to.be.false;
      expect(bamCmd.setupProject.called).to.be.true;
      bamCmd.setupProject.restore();
      bamCmd.runInstall.restore();
    });
  });

});
