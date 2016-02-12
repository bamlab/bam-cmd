
var Promise = require('bluebird');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');

var Callable = require('./utils/callable');

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

Config.prototype.runInstall = function(options, optional, ignorePostInstall) {
  var userInstall = new Callable(this.config, 'install', [options]);
  var pluginInstall = new Callable(null, 'runInstall', [options, true]);

  return this.runUserMethod(userInstall, pluginInstall, ! optional)
    .then(function() {
      if (this.isPlugin() || ignorePostInstall) {
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



//Config.prototype.runUserMethod = function (method, params, required, pluginMethod, pluginParams) {

Config.prototype.runUserMethod = function (userMethod, pluginMethod, required) {

  if (! (userMethod instanceof Callable)) {
    userMethod = new Callable(this.config, arguments[0], arguments[1]);
  }

  if (! (pluginMethod instanceof Callable) && arguments[3]) {
    pluginMethod = new Callable(null, arguments[3], arguments[4]);
  } else if (! (pluginMethod instanceof Callable)) {
    pluginMethod = null;
  }

  return this.checkValid()
    .then((function() {
      var pluginFinished;

      if (! userMethod.exists()) {
        if (required) {
          return Promise.reject(Error('No ' + userMethod.method + ' script'));
        } else {
          return Promise.resolve();
        }
      }

      if (pluginMethod) {
        pluginFinished = this.runPluginsMethod(pluginMethod);
      } else {
        pluginFinished = Promise.resolve();
      }

      return pluginFinished.then(function() {
        return userMethod.call();
      }.bind(this));
    }).bind(this));
};



Config.prototype.runPluginsMethod = function(callable, reverse) {

  if (! (callable instanceof Callable) ) {
    callable = new Callable(null, arguments[0], arguments[1]);
    reverse = arguments[2];
  }

  if (reverse) { 
    return Promise.each(this.plugins.reverse(), function(plugin) {
      callable.object = plugin;
      return callable.call();
    }).finally(function() {
      this.plugins.reverse();
    }.bind(this));
  }

  return Promise.each(this.plugins, function(plugin) {
    callable.object = plugin;
    return callable.call();
  });
};

module.exports = Config;
module.exports.defaultConfigFileName = defaultConfigFileName;
