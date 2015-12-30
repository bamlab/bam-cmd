var chai = require('chai');
var sinon = require('sinon');
var expect = chai.expect;

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

  it('should return enpty array if no linked repositories', function() {
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

});
