var chai = require('chai');
var sinon = require('sinon');
var expect = chai.expect;
var Command = require('../lib/commands');
var bamCmd = require('../lib/bam-cmd');
var Promise = require('bluebird');

var defaultCommand = new Command({
  configPath: __dirname + '/fixtures/bam-default.js',
});

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
      .then(function(config) {
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

  it('should run the build function', function() {
    var buildFn = sinon.spy();
    var command = new Command(undefined, [], {
      build: buildFn,
    });
    var option = {foo: Math.random()};

    return command.runBuild(option)
      .then(function() {
        expect(buildFn.calledWith(option)).to.be.true;
      });
  });

  it('should run the deploy function', function() {
    var buildFn = sinon.spy();
    var command = new Command(undefined, [], {
      deploy: buildFn,
    });
    var option = {foo: Math.random()};

    return command.runDeploy(option)
      .then(function() {
        expect(buildFn.calledWith(option)).to.be.true;
      });
  });

  it('should call the build function with the options', function() {
    var commands = new Command();
    var option = {foo: Math.random()};
    var args = ['node', 'bam-build'];


    sinon.stub(commands, 'runBuild');
    sinon.stub(commands, 'getBuildOptions')
      .returns(Promise.resolve(option));

    commands.build(args)
      .then(function() {
        expect(commands.runBuild.calledWith(option)).to.be.true;
        expect(commands.getBuildOptions.calledWith(args)).to.be.true;
      });
  });

  it('should deploy and build', function() {
    var commands = new Command();
    var option = {build: true};
    var args = ['node', 'bam-build'];


    sinon.stub(commands, 'runBuild');
    sinon.stub(commands, 'runDeploy');
    sinon.stub(commands, 'getBuildOptions')
      .returns(Promise.resolve(option));

    commands.deploy(args)
      .then(function() {
        expect(commands.runBuild.calledWith(option)).to.be.true;
        expect(commands.runDeploy.calledWith(option)).to.be.true;
        expect(commands.getBuildOptions.calledWith(args)).to.be.true;
      });
  });

  it('should deploy only', function() {
    var commands = new Command();
    var option = {build: false};
    var args = ['node', 'bam-build'];


    sinon.stub(commands, 'runBuild');
    sinon.stub(commands, 'runDeploy');
    sinon.stub(commands, 'getBuildOptions')
      .returns(Promise.resolve(option));

    commands.deploy(args)
      .then(function() {
        expect(commands.runBuild.called).to.be.false;
        expect(commands.runDeploy.calledWith(option)).to.be.true;
        expect(commands.getBuildOptions.calledWith(args)).to.be.true;
      });
  });

  it('should catch build errors', function() {
    var command = new Command({}, [], {
      build: function() {return Promise.reject()},
    });
    return command.build();
  });

  it('should catch deploy errors', function() {
    var command = new Command({}, [], {
      deploy: function() {return Promise.reject()},
    });
    return command.deploy();
  });

});
