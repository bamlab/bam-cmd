
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
  this.plugins = [];

  if (_.isPlainObject(config)) {
    this.config = config;
  } else if (_.isString(config)) {
    this.configPath = config;
  }
}


Config.prototype.load = function () {
  var loaded;

  if (this.config !== null) {
    loaded = Promise.resolve(this);
  } else {
    loaded = this.loadFile(this.configPath);
  }

  return loaded.then(function(config) {
    return config.loadPlugins();
  }).then(function() {
    return this;
  }.bind(this));
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

Config.prototype.loadPlugins = function() {
  var plugins = _.get(this.config, 'plugins', []);
  var pluginLoads = [];

  _.forEach(plugins, function(plugin) {
    var config = new Config(plugin);
    var promise = config.load().then(function() {
      this.plugins.push(config);
    }.bind(this));

    pluginLoads.push(promise);
  }.bind(this));

  return Promise.all(pluginLoads);
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

Config.prototype.runInstall = function(options) {
  return this.checkValid()
    .then(function() {
      if (!this.config.install) {
        return Promise.reject(Error('No install script'));
      }

      return this.runPluginsMethod('runInstall', [options]);
    }.bind(this)).then(function(){
      return this.config.install(options);
    }.bind(this));
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


Config.prototype.runPluginsMethod = function(method, params) {
  return Promise.each(this.plugins, function(plugin) {
    plugin[method].apply(plugin, params);
  });
};

module.exports = Config;
module.exports.defaultConfigFileName = defaultConfigFileName;
