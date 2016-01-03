var chai = require('chai');
var sinon = require('sinon');
var expect = chai.expect;
var _ = require('lodash');

var Config = require('../lib/config');

var path = require('path');
var fs = require('fs');

var plainConfig = require('./fixtures/bam-default');

function expectToBeRejected(promise) {
  expect(promise.then).to.exist;

  var success = sinon.spy();
  var error = sinon.stub();
  return promise.then(success, error).then(function() {
    expect(success.called).to.be.false;
    expect(error.called).to.be.true;
    expect(error.getCall(0).args[0]).to.be.instanceOf(Error);
  });
}

describe('Config Entity', function() {

  it('should load the user config from an object', function() {
    var config = new Config(plainConfig);
    return config.load().then(function(param) {
      expect(param).to.be.equals(config);
      expect(config.getDirName()).to.be.equals(plainConfig.dirName);
    });
  });

  it('should load a user config from a filename', function() {
    var filename = path.resolve(__dirname, 'fixtures', 'bam-default.js');
    var config = new Config(filename);
    return config.load().then(function (param) {
      expect(param).to.be.equals(config);
      expect(config.getDirName()).to.be.equals(plainConfig.dirName);
    });
  });

  it('should load from filename with loadFile function', function() {
    var filename = path.resolve(__dirname, 'fixtures', 'bam-default.js');
    var config = new Config();
    return config.loadFile(filename).then(function (param) {
      expect(param).to.be.equals(config);
      expect(config.getDirName()).to.be.equals(plainConfig.dirName);
    });
  });

  it('should create rejection if file not found', function() {
    var config = new Config('notExist');
    var promise = config.load();
    return expectToBeRejected(promise);
  });

  it('should create rejection if file is a dir', function() {
    var config = new Config('lib');
    var promise = config.load();
    return expectToBeRejected(promise);
  });

  it('should create rejection if file not found with loadFile', function() {
    var config = new Config();
    var promise = config.loadFile('notExist');
    return expectToBeRejected(promise);
  });

  it('should try to load a bam.js if no filename provided', function() {
    var config = new Config();
    var promise = config.load();
    return expectToBeRejected(promise).then(function() {
      var filename = config.configPath;
      expect(path.resolve(filename)).to.be.equals(path.resolve('bam.js'));
    });
  });

  it('should try to load a bam.js if no filename provided in loadFile', function() {
    var config = new Config();
    var promise = config.loadFile();
    return expectToBeRejected(promise).then(function() {
      var filename = config.configPath;
      expect(path.resolve(filename)).to.be.equals(path.resolve('bam.js'));
    });
  });

  it('should get the dir name', function() {
    var config = new Config(plainConfig);
    return config.load().then(function() {
      expect(config.getDirName()).to.be.equals(plainConfig.dirName);
    });
  });

  it('should throw if not loaded when get the dir name', function() {
    var config = new Config();
    expect(function(){config.getDirName()}).to.throw(Error);
  });

  it('should get linked repositories', function() {
    var repos = ['repo1', 'rep2', 'r3'];

    var config = new Config({
      linkedRepos: repos
    });
    return config.load().then(function() {
      expect(config.getLinkedRepos()).to.be.equals(repos);
    });
  });

  it('should return empty array if no linked repositories', function() {
    var config = new Config({});
    return config.load().then(function() {
      expect(config.getLinkedRepos()).to.be.instanceOf(Array);
      expect(config.getLinkedRepos().length).to.be.equals(0);
    });
  });

  it('should throw if not loaded when get the dir name', function() {
    var config = new Config();
    expect(function(){config.getLinkedRepos()}).to.throw(Error);
  });


  it('should run install script', function() {
    sinon.spy(plainConfig, 'install');
    var config = new Config(plainConfig);

    return config.load().then(function() {
      return config.runInstall();
    }).then(function() {
      expect(plainConfig.install.called).to.be.true;
      plainConfig.install.restore();
    });
  });

  it('should throw if not loaded when run install', function() {
    var config = new Config();
    expectToBeRejected(config.runInstall());
  });

  it('should throw if no install function', function() {
    var config = new Config({});
    return config.load().then(function() {
      expectToBeRejected(config.runInstall());
    });
  });

  it('should run buildOption script', function() {
    sinon.stub(plainConfig, 'buildOptions');
    var config = new Config(plainConfig);

    var commander = require('commander');

    return config.load().then(function() {
      return config.buildOptions(commander);
    }).then(function() {
      expect(plainConfig.buildOptions.called).to.be.true;
      expect(plainConfig.buildOptions.getCall(0).args[0]).to.be.equals(commander);
      plainConfig.buildOptions.restore();
    });
  });

  it('should throw if not loaded when run build options', function() {
    var config = new Config();
    expectToBeRejected(config.buildOptions());
  });

  it('should continue if no build option function ', function() {
    var config = new Config({});
    return config.load().then(function() {
      return config.buildOptions();
    });
  });

  it('should run build script', function() {
    sinon.spy(plainConfig, 'build');
    var config = new Config(plainConfig);

    return config.load().then(function() {
      return config.runBuild();
    }).then(function() {
      expect(plainConfig.build.called).to.be.true;
      plainConfig.build.restore();
    });
  });

  it('should throw if not loaded when run build', function() {
    var config = new Config();
    expectToBeRejected(config.runBuild());
  });

  it('should throw if no build function', function() {
    var config = new Config({});
    return config.load().then(function() {
      expectToBeRejected(config.runBuild());
    });
  });

  it('should run deploy script', function() {
    sinon.spy(plainConfig, 'deploy');
    var config = new Config(plainConfig);
    var options = {};

    return config.load().then(function() {
      return config.runDeploy(options);
    }).then(function() {
      expect(plainConfig.deploy.called).to.be.true;
      expect(plainConfig.deploy.getCall(0).args[0]).to.be.equals(options);
      plainConfig.deploy.restore();
    });
  });

  it('should throw if not loaded when run deploy', function() {
    var config = new Config();
    expectToBeRejected(config.runDeploy());
  });

  it('should throw if no deploy function', function() {
    var config = new Config({});
    return config.load().then(function() {
      expectToBeRejected(config.runDeploy());
    });
  });

});
