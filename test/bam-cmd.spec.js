var chai = require('chai');
var sinon = require('sinon');
var expect = chai.expect;

var path = require('path');
var childProcess = require('child_process');
var Promise = require('bluebird');
var fs = require('fs');

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

  it('should run a command', function() {
    sinon.stub(bamCmd, 'spawn');

    var returns = {then: function() {}};
    var cmd = 'ls';
    var args = ['args'];

    bamCmd.spawn.returns(returns);

    expect(bamCmd.run(cmd, args)).to.be.equals(returns);
    expect(bamCmd.spawn.called).to.be.true;

    var spawnCallArgs = bamCmd.spawn.getCall(0).args;
    expect(spawnCallArgs[0]).to.be.equals(cmd);
    expect(spawnCallArgs[1]).to.be.equals(args);

    bamCmd.spawn.restore();
  });


  // Cloning
  it ('should clone the repository', function() {
    sinon.stub(bamCmd, 'run');

    bamCmd.run.returns(Promise.resolve());
    repo = repos[0];

    var promise = bamCmd.cloneRepository(repo.givenParam, 'dir', 'parent');

    var runCallArgs = bamCmd.run.getCall(0).args;
    expect(runCallArgs[0]).to.be.equals('git');
    expect(runCallArgs[1]).to.have.members([
      'clone', '--recursive', repo.repoFullName, path.resolve('parent', 'dir')
    ]);

    bamCmd.run.restore();
  });

  it ('should clone the repository in the current dir', function() {
    sinon.stub(bamCmd, 'run');

    bamCmd.run.returns(Promise.resolve());
    repo = repos[0];

    var promise = bamCmd.cloneRepository(repo.givenParam);

    var runCallArgs = bamCmd.run.getCall(0).args;
    expect(runCallArgs[0]).to.be.equals('git');
    expect(runCallArgs[1]).to.have.members([
      'clone', '--recursive', repo.repoFullName, path.resolve('.', repo.repoName)
    ]);

    bamCmd.run.restore();
  });


  // rename directory
  it('should rename a project directory', function() {
    sinon.stub(fs, 'renameSync');

    var expectedFinalDir = "finalDir"
    var option = {getDirName: function() {
      return expectedFinalDir;
    }};

    return bamCmd.renameProjectDir('currentDir', option)
      .then(function(finalDir) {

        expect(finalDir).to.be.equals(path.resolve(expectedFinalDir));

        var renameArgs = fs.renameSync.getCall(0).args;
        expect(renameArgs[0]).to.be.equals('currentDir');
        expect(renameArgs[1]).to.be.equals(finalDir);

        fs.renameSync.restore();
      });
  });

  it('should rename a project directory with default param', function() {
    sinon.stub(fs, 'renameSync');
    sinon.stub(bamCmd, 'loadFromDir');

    var expectedFinalDir = "finalDir"
    var option = {getDirName: function() {
      return expectedFinalDir;
    }};

    bamCmd.loadFromDir.returns(Promise.resolve(option));

    return bamCmd.renameProjectDir()
      .then(function(finalDir) {

        expect(finalDir).to.be.equals(path.resolve('..', finalDir));

        var renameArgs = fs.renameSync.getCall(0).args;
        expect(renameArgs[0]).to.be.equals('.');
        expect(renameArgs[1]).to.be.equals(finalDir);

        bamCmd.loadFromDir.restore();
        fs.renameSync.restore();
      });
  });

  it('should handle absolute path when rename a project directory', function() {
    sinon.stub(fs, 'renameSync');

    var expectedFinalDir = "finalDir"
    var option = {getDirName: function() {
      return expectedFinalDir;
    }};

    return bamCmd.renameProjectDir('/path/to/currentDir', option)
      .then(function(finalDir) {

        expect(finalDir).to.be.equals('/path/to/finalDir');

        var renameArgs = fs.renameSync.getCall(0).args;
        expect(renameArgs[0]).to.be.equals('/path/to/currentDir');
        expect(renameArgs[1]).to.be.equals(finalDir);

        fs.renameSync.restore();
      });
  });

  it('should don\'t rename if no dest dir given', function() {
    sinon.stub(fs, 'renameSync');

    var option = {getDirName: function() {
      return '';
    }};

    return bamCmd.renameProjectDir('currentDir', option)
      .then(function(finalDir) {

        expect(finalDir).to.be.equals(path.resolve('currentDir'));
        expect(fs.renameSync.called).to.be.false;

        fs.renameSync.restore();
      });
  });

});
