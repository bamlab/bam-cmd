/* global describe, it */

var chai = require('chai');
var sinon = require('sinon');
var expect = chai.expect;

var path = require('path');
var childProcess = require('child_process');
var Promise = require('bluebird');
var fs = require('fs');

var bamCmd = require('../lib/bam-cmd.js');

var repos = require('./fixtures/repositories');

describe('bam-cmd main module', function() {

  // Git url generation
  it('should return the full url', function () {
    var defaultConfig = {
      defaultBaseUrl: 'git@github.com:',
      defaultUrlFolder: 'orga',
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

  it('should throw Error on invalid name', function() {
    var fn = function() {
      bamCmd.getRepositoryName(')');
    };

    expect(fn).to.throw(Error);
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
      on: function(event, cb) {return cb(0);},
    };

    childProcess.spawn.returns(eventManager);

    var cmd = 'ls';
    var args = ['args'];
    var options = {cwd: '..'};

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
      on: function(event, cb) {return cb(errorCode);},
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

  it('should run a command', function(done) {
    sinon.stub(childProcess, 'spawn');

    var errorCode = 0;
    var eventManager = {
      on: function(event, cb) {return cb(errorCode);},
    };

    childProcess.spawn.returns(eventManager);

    var success = sinon.spy();
    var error = sinon.spy();

    bamCmd.run('ls', ['args']).then(success, error)
      .then(function() {
        expect(success.called).to.be.true;
        expect(error.called).to.be.false;

        errorCode = 1;
        return bamCmd.run('ls', ['args']).then(success, error);
      })
      .then(function() {
        expect(error.called).to.be.true;
        done();
      }, done);


    childProcess.spawn.restore();
  });


  // Cloning
  it ('should clone the repository', function() {
    sinon.stub(bamCmd, 'run');

    bamCmd.run.returns(Promise.resolve());
    var repo = repos[0];

    bamCmd.cloneRepository(repo.givenParam, 'dir', 'parent');

    var runCallArgs = bamCmd.run.getCall(0).args;
    expect(runCallArgs[0]).to.be.equals('git');
    expect(runCallArgs[1]).to.have.members([
      'clone', '--recursive', repo.repoFullName, path.resolve('parent', 'dir'),
    ]);

    bamCmd.run.restore();
  });

  it ('should clone the repository in the current dir', function() {
    sinon.stub(bamCmd, 'run');

    bamCmd.run.returns(Promise.resolve());
    var repo = repos[0];

    bamCmd.cloneRepository(repo.givenParam);

    var runCallArgs = bamCmd.run.getCall(0).args;
    expect(runCallArgs[0]).to.be.equals('git');
    expect(runCallArgs[1]).to.have.members([
      'clone', '--recursive', repo.repoFullName, path.resolve('.', repo.repoName),
    ]);

    bamCmd.run.restore();
  });


  // rename directory
  it('should rename a project directory', function() {
    sinon.stub(fs, 'renameSync');

    var expectedFinalDir = 'finalDir';
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

    var expectedFinalDir = 'finalDir';
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

    var expectedFinalDir = 'finalDir';
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


  // linked repositories
  it('should install the linked repositories', function() {
    sinon.stub(bamCmd, 'installProject');

    var repos = ['repo1', 'rep2', 'r3'];
    var config = {getLinkedRepos: function() {
      return repos;
    }};
    var projectConfig = {};

    bamCmd.installProject.returns(Promise.resolve(projectConfig));
    var promise = bamCmd.fetchLinkedRepos(config, 'baseDir');

    expect(bamCmd.installProject.callCount).to.be.equals(3);

    var i;
    for (i = 0; i < 3; i++) {
      var args = bamCmd.installProject.getCall(i).args;
      expect(args[0]).to.be.equals(repos[i]);
      expect(args[1]).to.be.equals('baseDir');
      expect(args[2]).to.be.equals(true);
      expect(args[3]).to.be.equals(true);
    }

    bamCmd.installProject.restore();

    return promise.then(function(result) {
      expect(result.length).to.be.equals(3);
      expect(result[0]).to.be.equals(projectConfig);
      expect(result[1]).to.be.equals(projectConfig);
      expect(result[2]).to.be.equals(projectConfig);
    });
  });


  it('should not stop installing linked repositories on errors', function() {
    sinon.stub(bamCmd, 'installProject');

    var repos = ['repo1', 'rep2', 'r3'];
    var config = {getLinkedRepos: function() {return repos;}};

    bamCmd.installProject.returns(Promise.reject());
    return bamCmd.fetchLinkedRepos(config, 'baseDir').then(function() {
      bamCmd.installProject.restore();
    });
  });

  // run setup Project commad
  it('should launch the bam-run-install script', function() {
    sinon.stub(childProcess, 'fork');
    var eventManager = {on: function(event, cb) {return cb(0);},};
    childProcess.fork.returns(eventManager);

    return bamCmd.runSetupProjectCommand('directory')
      .then(function() {
        expect(childProcess.fork.called).to.be.true;

        expect(childProcess.fork.getCall(0).args[0]).to.match(/bam-run-install$/);
        expect(childProcess.fork.getCall(0).args[1][0]).to.be.equals('-s');
        expect(childProcess.fork.getCall(0).args[2].cwd).to.be.equals('directory');
        childProcess.fork.restore();
      });
  });

  // npm install
  it('should run npm install', function() {
    sinon.stub(fs, 'statSync');
    sinon.stub(bamCmd, 'spawn');

    var spawnReturn = {then: function(){}};
    bamCmd.spawn.returns(spawnReturn);

    var promise = bamCmd.installNodeDependencies('directory');

    expect(promise).to.be.equals(spawnReturn);

    var spawnArgs = bamCmd.spawn.getCall(0).args;
    expect(spawnArgs[0]).to.be.equals('npm');
    expect(spawnArgs[1][0]).to.be.equals('install');
    expect(spawnArgs[2].cwd).to.be.equals('directory');

    fs.statSync.restore();
    bamCmd.spawn.restore();
  });

  it('should ignore project with no package.json', function() {
    sinon.stub(fs, 'statSync');
    sinon.stub(bamCmd, 'spawn');

    var success = sinon.spy();
    var failure = sinon.spy();
    fs.statSync.throws();

    return bamCmd.installNodeDependencies('directory')
      .then(success, failure)
      .then(function() {

        expect(success.called).to.be.true;
        expect(failure.called).to.be.false;

        expect(bamCmd.spawn.called).to.be.false;

        fs.statSync.restore();
        bamCmd.spawn.restore();
      });

  });

  // project installation
  it('should do all the 3 first documentated steps', function() {
    var config = {};
    sinon.stub(bamCmd, 'cloneRepository');
    sinon.stub(bamCmd, 'installNodeDependencies');
    sinon.stub(bamCmd, 'loadFromDir');
    sinon.stub(bamCmd, 'setupProject');

    bamCmd.cloneRepository.returns(Promise.resolve('dest'));
    bamCmd.installNodeDependencies.returns(Promise.resolve());
    bamCmd.loadFromDir.returns(Promise.resolve(config));
    bamCmd.setupProject.returns(Promise.resolve());

    return bamCmd.installProject().then(function(returnValue) {

      expect(bamCmd.cloneRepository.called).to.be.true;
      expect(bamCmd.installNodeDependencies.called).to.be.true;
      expect(bamCmd.loadFromDir.called).to.be.true;
      expect(bamCmd.setupProject.called).to.be.true;

      expect(returnValue).to.be.equals(config);

      bamCmd.cloneRepository.restore();
      bamCmd.installNodeDependencies.restore();
      bamCmd.loadFromDir.restore();
      bamCmd.setupProject.restore();
    });
  });

  it('should don\'t send errors if no bam.js', function() {
    sinon.stub(bamCmd, 'cloneRepository');
    sinon.stub(bamCmd, 'installNodeDependencies');
    sinon.stub(bamCmd, 'loadFromDir');

    bamCmd.cloneRepository.returns(Promise.resolve('dest'));
    bamCmd.installNodeDependencies.returns(Promise.resolve());
    bamCmd.loadFromDir.returns(Promise.reject());

    var success = sinon.spy();
    var failure = sinon.spy();

    return bamCmd.installProject('name', 'dest')
      .then(success, failure)
      .then(function() {

        expect(success.called).to.be.true;
        expect(failure.called).to.be.false;

        bamCmd.cloneRepository.restore();
        bamCmd.installNodeDependencies.restore();
        bamCmd.loadFromDir.restore();
      });
  });

  it('should send errors if no bam.js and it is required', function() {
    sinon.stub(bamCmd, 'cloneRepository');
    sinon.stub(bamCmd, 'installNodeDependencies');
    sinon.stub(bamCmd, 'loadFromDir');

    bamCmd.cloneRepository.returns(Promise.resolve('dest'));
    bamCmd.installNodeDependencies.returns(Promise.resolve());
    bamCmd.loadFromDir.returns(Promise.reject());

    var success = sinon.spy();
    var failure = sinon.spy();

    return bamCmd.installProject('name', 'dest', true)
      .then(success, failure)
      .then(function() {

        expect(success.called).to.be.false;
        expect(failure.called).to.be.true;

        bamCmd.cloneRepository.restore();
        bamCmd.installNodeDependencies.restore();
        bamCmd.loadFromDir.restore();
      });
  });


  // setup project
  it ('should do the 3 remaining steps', function() {
    sinon.stub(bamCmd, 'renameProjectDir');
    sinon.stub(bamCmd, 'fetchLinkedRepos');
    sinon.stub(bamCmd, 'runInstall');

    var config = {
      runPostInstall: sinon.spy(),
    };
    var linkedConfig = {
      runPostInstall: sinon.spy(),
    };
    var options = {};

    bamCmd.renameProjectDir.returns(Promise.resolve());
    bamCmd.fetchLinkedRepos.returns(Promise.resolve([linkedConfig, null]));
    bamCmd.runInstall.returns(Promise.resolve());

    return bamCmd.setupProject(process.cwd(), config, options).then(function() {

      expect(bamCmd.renameProjectDir.called).to.be.true;
      expect(bamCmd.fetchLinkedRepos.called).to.be.true;
      expect(bamCmd.runInstall.called).to.be.true;

      expect(config.runPostInstall.called).to.be.true;
      expect(linkedConfig.runPostInstall.called).to.be.true;

      expect(bamCmd.renameProjectDir.getCall(0).args[0]).to.be.equals(process.cwd());
      expect(bamCmd.renameProjectDir.getCall(0).args[1]).to.be.equals(config);

      expect(bamCmd.fetchLinkedRepos.getCall(0).args[0]).to.be.equals(config);

      expect(bamCmd.runInstall.getCall(0).args[0]).to.be.equals(config);
      expect(bamCmd.runInstall.getCall(0).args[1]).to.be.equals(options);

      bamCmd.renameProjectDir.restore();
      bamCmd.fetchLinkedRepos.restore();
      bamCmd.runInstall.restore();
    });
  }); 

  it ('should don\'t install linked', function() {
    sinon.stub(bamCmd, 'renameProjectDir');
    sinon.stub(bamCmd, 'fetchLinkedRepos');
    sinon.stub(bamCmd, 'runInstall');

    bamCmd.renameProjectDir.returns(Promise.resolve());
    bamCmd.runInstall.returns(Promise.resolve());
    var options = {
      installLinked: false,
    };
    var config = {
      runPostInstall: sinon.spy(),
    };

    return bamCmd.setupProject('.', config, options).then(function() {

      expect(bamCmd.fetchLinkedRepos.called).to.be.false;
      expect(bamCmd.runInstall.called).to.be.true;
      expect(config.runPostInstall.called).to.be.true;

      bamCmd.renameProjectDir.restore();
      bamCmd.fetchLinkedRepos.restore();
      bamCmd.runInstall.restore();
    });
  });

  it ('should call the run install command if not in the good dir', function() {
    sinon.stub(bamCmd, 'runSetupProjectCommand');
    sinon.stub(bamCmd, 'renameProjectDir');
    bamCmd.runSetupProjectCommand.returns(Promise.resolve());

    var config = {};
    var options = {};
    return bamCmd.setupProject('..', config, options).then(function() {

      expect(bamCmd.renameProjectDir.called).to.be.false;
      expect(bamCmd.runSetupProjectCommand.called).to.be.true;

      expect(bamCmd.runSetupProjectCommand.getCall(0).args[0]).to.be.equals('..');
      expect(bamCmd.runSetupProjectCommand.getCall(0).args[1]).to.be.equals(config);
      expect(bamCmd.runSetupProjectCommand.getCall(0).args[2]).to.be.equals(options);

      bamCmd.runSetupProjectCommand.restore();
      bamCmd.renameProjectDir.restore();
    });
  }); 

});
