
var $q = require('bluebird');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');

var stat = $q.promisify(fs.stat);
var defaultConfigFileName = 'bam.js';


function Config(config) {
  if (! (this instanceof Config)) {
    return new Config(configPath);
  }
  this.configPath = './' + defaultConfigFileName;
  this.config = null;

  if (_.isPlainObject(config)) {
    this.config = config;
  } else if (_.isString(config)) {
    this.configPath = config;
  }
}


Config.prototype.load = function () {
  if (this.config !== null) {
    return $q.resolve(this);
  }

  return this.loadFile(this.configPath);
};

Config.prototype.loadFile = function (configPath) {
  this.configPath = path.resolve(configPath || ('./' + defaultConfigFileName));

  return stat(this.configPath)
    .then((function(stats) {
      if (! stats.isFile()) {
        return $q.reject();
      }

      return this.configPath;
    }).bind(this)).catch((function(e) {
      return $q.reject('BAM configuration ' + this.configPath + ' not found');
    }).bind(this))
    .then(function(configPath) {
      this.config = require(configPath);
      return this;
    }.bind(this));
};

Config.prototype.checkValidSync = function() {
  if (this.config === null) {
    throw Error('Configuration not loaded');
  }
};

Config.prototype.checkValid = function(forwardedParam) {
  try {
    this.checkValidSync();
    return $q.resolve(forwardedParam);
  } catch (e) {
    return $q.reject(e);
  }
};

Config.prototype.getDirName = function() {
  this.checkValidSync();
  return this.config.dirName;
};

Config.prototype.getLinkedRepos = function() {
  this.checkValidSync();
  var repos = this.config.linkedRepos;
  if (! repos) {
    repos = [];
  }
  return repos;
};

Config.prototype.runInstall = function() {
  return this.checkValid()
    .then((function() {
      return this.config.install();
    }).bind(this));
};

Config.prototype.buildOptions = function(commander) {
  return this.checkValid()
    .then((function() {
      if (! this.config.buildOptions) {
        return $q.resolve();
      }
      return this.config.buildOptions(commander);
    }).bind(this));
};

Config.prototype.runBuild = function(options) {
  return this.checkValid()
    .then((function() {
      if (! this.config.build) {
        return $q.reject('No build script');
      }
      return this.config.build(options);
    }).bind(this));
};

Config.prototype.runDeploy = function(options) {
  return this.checkValid()
    .then((function() {
      if (! this.config.deploy) {
        return $q.reject('No deploy script');
      }
      return this.config.deploy(options);
    }).bind(this));
};

module.exports = Config;
module.exports.defaultConfigFileName = defaultConfigFileName;
