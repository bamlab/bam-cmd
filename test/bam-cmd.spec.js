var chai = require('chai');
var sinon = require('sinon');
var expect = chai.expect;

var path = require('path');
var childProcess = require('child_process');

var bamCmd = require('..');

var repos = require('./fixtures/repositories');

describe('bam-cmd main module', function() {

  // Git url generation
  it('should return the full url', function () {
    var defaultConfig = {
      defaultBaseUrl: 'git@github.com:',
      defaultUrlFolder: 'orga'
    };
    var originalLoasScriptConfigFunction = bamCmd.loadScriptConfig;
    bamCmd.loadScriptConfig = function () {
      return defaultConfig;
    };

    repos.forEach(function (repo) {
      expect(bamCmd.getFullGitUrl(repo.givenParam)).to.be.equals(repo.repoFullName);
    });

    bamCmd.loadScriptConfig = originalLoasScriptConfigFunction;
  });

  it('should return the repo name from the url', function () {
    repos.forEach(function (repo) {
      expect(bamCmd.getRepositoryName(repo.repoFullName)).to.be.equals(repo.repoName);
    });
  });

  // Create new command
  it('should create a new Command object', function() {
    var Command = require('../lib/commands.js');
    var commandReturned = bamCmd.createCommand({}, process.argv);
    expect(commandReturned instanceof Command).to.be.true;
  });

  // Load config
  it('should load a config file from a directory', function() {
    sinon.stub(bamCmd, 'loadConfig');

    var fakeConfig = {foo: 'bar'};
    bamCmd.loadConfig.returns(fakeConfig);

    expect(bamCmd.loadFromDir('dirname')).to.be.equal(fakeConfig);
    expect(bamCmd.loadConfig.called).to.be.true;

    var loadConfigArg = bamCmd.loadConfig.getCall(0).args[0];
    expect(loadConfigArg).to.be.equals(path.resolve('dirname', 'bam.js'));

    bamCmd.loadConfig.restore();
  });

  // Launch command helper
  it('should launch a script', function() {
    sinon.stub(childProcess, 'spawn');

    var eventManager = {
      on: function(event, cb) {return cb(0);}
    };

    childProcess.spawn.returns(eventManager);

    var cmd = 'ls';
    var args = ['args'];
    var options = {cwd: '..'};

    var success = sinon.spy();
    var error = sinon.spy();

    bamCmd.spawn(cmd, args, options);
    expect(childProcess.spawn.called).to.be.true;

    var spawnCallArgs = childProcess.spawn.getCall(0).args;
    expect(spawnCallArgs[0]).to.be.equals(cmd);
    expect(spawnCallArgs[1]).to.be.equals(args);
    expect(spawnCallArgs[2]).to.be.equals(options);


    childProcess.spawn.restore();
  });

  it('should return a promise for spawn method', function(done) {
    sinon.stub(childProcess, 'spawn');

    var errorCode = 0;
    var eventManager = {
      on: function(event, cb) {return cb(errorCode);}
    };

    childProcess.spawn.returns(eventManager);

    var success = sinon.spy();
    var error = sinon.spy();

    bamCmd.spawn('ls', ['args'], {}).then(success, error)
      .then(function() {
        expect(success.called).to.be.true;
        expect(error.called).to.be.false;

        errorCode = 1;
        return bamCmd.spawn('ls', ['args'], {}).then(success, error);
      })
      .then(function() {
        expect(error.called).to.be.true;
        done();
      }, done);


    childProcess.spawn.restore();
  });


});
