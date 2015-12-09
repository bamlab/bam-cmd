var chai = require('chai');
var sinon = require('sinon');
var expect = chai.expect;
var bamCmd = require('..');

var repos = require('./fixtures/repositories');

describe('bam-cmd main module', function() {

  describe('getFullGitUrl', function() {
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
  });


});
