
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
  this.plugin = false;

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
  }.bind(this)).then(function() {
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

    config.isPlugin(true);
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

/**
 * Get or set if the config is related to a plugin
 * @param {boolean} plugin New value (optional)
 * @returns {boolean}
 */
Config.prototype.isPlugin = function(plugin) {
  if (! _.isUndefined(plugin)) {
    this.plugin = plugin;
  }

  return this.plugin;
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

Config.prototype.runInstall = function(options, optional) {
  return this.runUserMethod('install', [options], ! optional, 'runInstall', [options, true])
    .then(function() {
      if (this.isPlugin()) {
        return Promise.resolve();
      }

      return this.runPostInstall(options);
    }.bind(this));
};

Config.prototype.runPostInstall = function(options) {
  return this.runPluginsMethod('runPostInstall', [options], true)
    .then(function() {
      return this.runUserMethod('postInstall', [options], false);
    }.bind(this));
};

Config.prototype.buildOptions = function(commander) {
  return this.runUserMethod('buildOptions', [commander], false);
};

Config.prototype.runBuild = function(options) {
  return this.runUserMethod('build', [options], true);
};

Config.prototype.runDeploy = function(options) {
  return this.runUserMethod('deploy', [options], true);
};



Config.prototype.runUserMethod = function (method, params, required, pluginMethod, pluginParams) {
  return this.checkValid()
    .then((function() {
      var pluginFinished;

      if (! _.has(this.config, method)) {
        if (required) {
          return Promise.reject(Error('No ' + method + ' script'));
        } else {
          return Promise.resolve();
        }
      }

      if (pluginMethod) {
        pluginFinished = this.runPluginsMethod(pluginMethod, pluginParams);
      } else {
        pluginFinished = Promise.resolve();
      }

      return pluginFinished.then(function() {
        return this.config[method].apply(this.config, params);
      }.bind(this));
    }).bind(this));
};



Config.prototype.runPluginsMethod = function(method, params, reverse) {
  if (reverse) { 
    return Promise.each(this.plugins.reverse(), function(plugin) {
      plugin[method].apply(plugin, params);
    }).finally(function() {
      this.plugins.reverse();
    }.bind(this));
  }

  return Promise.each(this.plugins, function(plugin) {
    plugin[method].apply(plugin, params);
  });
};

module.exports = Config;
module.exports.defaultConfigFileName = defaultConfigFileName;
