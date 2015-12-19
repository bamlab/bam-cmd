var chai = require('chai');
var sinon = require('sinon');
var expect = chai.expect;
var path = require('path');
var bamCmd = require('..');

var repos = require('./fixtures/repositories');

describe('bam-cmd main module', function() {

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

  it('should create a new Command object', function() {
    var Command = require('../lib/commands.js');
    var commandReturned = bamCmd.createCommand({}, process.argv);
    expect(commandReturned instanceof Command).to.be.true;
  });

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



});
