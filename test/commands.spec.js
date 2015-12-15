var chai = require('chai');
var sinon = require('sinon');
var expect = chai.expect;
var Command = require('../lib/commands');
var Promise = require('bluebird');


describe('commands', function() {


  it('should get the package version', function() {
    var command = new Command();
    expect(command.getVersion()).to.be.equals('0.1.0');
  });

  it('should loas the config file', function(done) {

    var expectedConfig = require('./fixtures/bam-default');
    var command = new Command({
      configPath: __dirname + '/fixtures/bam-default.js',
    });

    command.loadConfig()
      .then(function(config) {
        expect(config.config.version).to.be.equals(expectedConfig.version);
        done();
      }, function(err) {
        done(err);
      });
  });


  it('should load build options', function(done) {
    var command = new Command({
      configPath: __dirname + '/fixtures/bam-default.js',
    });

    command.getBuildOptions(['node', 'cmd', '-e', 'prod'])
      .then(function(options) {
        expect(options.env).to.be.equals('prod');
        done();
      }, function(err) {
        done(err);
      });
  });

  it('should have staging as default env', function(done) {
    var command = new Command({
      configPath: __dirname + '/fixtures/bam-default.js',
    });

    command.getBuildOptions(['node', 'cmd'])
      .then(function(options) {
        expect(options.env).to.be.equals('staging');
        done();
      }, function(err) {
        done(err);
      });
  });

  it('should run the build function', function(done) {
    var buildFn = sinon.spy();
    var command = new Command(undefined, [], {
      build: buildFn
    });
    var option = {foo: Math.random()};

    command.runBuild(option)
      .then(function() {
        expect(buildFn.calledWith(option)).to.be.true;
        done();
      }, function(err) {
        done(err);
      });
  });

  it('should run the deploy function', function(done) {
    var buildFn = sinon.spy();
    var command = new Command(undefined, [], {
      deploy: buildFn
    });
    var option = {foo: Math.random()};

    command.runDeploy(option)
      .then(function() {
        expect(buildFn.calledWith(option)).to.be.true;
        done();
      }, function(err) {
        done(err);
      });
  });

  it('should call the build function with the options', function(done) {
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
        done();
      }, function(err) {
        done(err);
      });
  });

  it('should deploy and build', function(done) {
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
        done();
      }, function(err) {
        done(err);
      });
  });

  it('should deploy only', function(done) {
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
        done();
      }, function(err) {
        done(err);
      });
  });

});
