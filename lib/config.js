
var Promise = require('bluebird');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');

var stat = Promise.promisify(fs.stat);
var defaultConfigFileName = 'bam.js';

/**
 * Config object constructor
 *
 * Higher level to acces to the user defined configuration
 * @param {Object|String} config The user defined config object or a filename
 * @returns {Config}
 * @constructor
 */
function Config(config) {
  if (! (this instanceof Config)) {
    return new Config(config);
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
    return Promise.resolve(this);
  }

  return this.loadFile(this.configPath);
};

Config.prototype.loadFile = function (configPath) {
  this.configPath = path.resolve(configPath || ('./' + defaultConfigFileName));

  return stat(this.configPath)
    .then((function(stats) {
      if (! stats.isFile()) {
        return Promise.reject();
      }

      return this.configPath;
    }).bind(this)).catch((function() {
      var error = Error('BAM configuration ' + this.configPath + ' not found');
      return Promise.reject(error);
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
    return Promise.resolve(forwardedParam);
  } catch (e) {
    return Promise.reject(e);
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
      if (! this.config.install) {
        return Promise.reject(Error('No install script'));
      }
      return this.config.install();
    }).bind(this));
};

Config.prototype.buildOptions = function(commander) {
  return this.checkValid()
    .then((function() {
      if (! this.config.buildOptions) {
        return Promise.resolve();
      }
      return this.config.buildOptions(commander);
    }).bind(this));
};

Config.prototype.runBuild = function(options) {
  return this.checkValid()
    .then((function() {
      if (! this.config.build) {
        return Promise.reject(Error('No build script'));
      }
      return this.config.build(options);
    }).bind(this));
};

Config.prototype.runDeploy = function(options) {
  return this.checkValid()
    .then((function() {
      if (! this.config.deploy) {
        return Promise.reject(Error('No deploy script'));
      }
      return this.config.deploy(options);
    }).bind(this));
};

module.exports = Config;
module.exports.defaultConfigFileName = defaultConfigFileName;
