
var Promise = require('./utils/promise');
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

/**
 * Load the config
 * @returns {Promise} Resolved to this
 */
Config.prototype.load = function () {
  var loaded;

  if (this.config !== null) {
    loaded = Promise.resolve(this);
  } else {
    loaded = this.loadFile(this.configPath);
  }

  return loaded.then(function(config) {
    return config._loadPlugins();
  }.bind(this)).then(function() {
    return this;
  }.bind(this));
};

/**
 * Load the config from a file
 * @param {string} configPath Path of the file
 * @returns {Promise} resolved to this
 */
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

/**
 * Load the plugins of the config
 * @returns {Promise}
 */
Config.prototype._loadPlugins = function() {
  var plugins = _.get(this.config, 'plugins', []);
  var pluginLoads = [];

  _.forEach(plugins, function(plugin) {
    var config = new Config(plugin);

    pluginLoads.push(config.load());

    config.isPlugin(true);
    this.plugins.push(config);
  }.bind(this));

  return Promise.all(pluginLoads);
};

/**
 * Check if the config is valid (have been loaded)
 * Throw an error id not
 *
 * @throws Config not loaded
 */
Config.prototype.checkValidSync = function() {
  if (this.config === null) {
    throw Error('Configuration not loaded');
  }
};

/**
 * Check if the config is valid (have been loaded)
 *
 * @param forwardedParam
 *
 * @return {Promise} Resolved to the first param if loaded, rejected if not
 */
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

/**
 * Ge the directory name in the config file
 *
 * @returns {string}
 */
Config.prototype.getDirName = function() {
  this.checkValidSync();
  return this.config.dirName;
};

/**
 * Get the linked repositories
 * @returns {string[]}
 */
Config.prototype.getLinkedRepos = function() {
  this.checkValidSync();
  var repos = this.config.linkedRepos;
  if (! repos) {
    repos = [];
  }
  return repos;
};

/**
 * Run the user install script
 * Will launch the plugin installation and post-installation
 *
 * @param {Object} options Command options
 * @param {boolean} optional If should reject if no install script is found (optional, default false)
 * @param {boolean} ignorePostInstall If should not launch the post-install script
 * @returns {Promise}
 */
Config.prototype.runInstall = function(options, optional, ignorePostInstall) {
  var userInstall = new Callable(this.config, 'install', [options]);
  var pluginInstall = new Callable(null, 'runInstall', [options, true]);

  return this.runUserMethod(userInstall, pluginInstall, ! optional)
    .then(function() {
      if ( !(this.isPlugin() || ignorePostInstall)) {
        return this.runPostMethod('install', options);
      }
    }.bind(this));
};

/**
 * Run post install script
 * 
 * @param {Object} options Command options
 * @returns {Promise}
 * @deprecated
 */
Config.prototype.runPostInstall = function(options) {
  return this.runPostMethod('install', options);
};

/**
 * Launch the build options
 * 
 * @param {Commander} commander The commander object
 * @returns {Promise}
 * @deprecated
 */
Config.prototype.buildOptions = function(commander) {
  return this.getOptions('build', commander);
};

/**
 *
 * @param {String} command
 * @param {Commander} commander The commander object
 * @returns {Promise}
 */
Config.prototype.getOptions = function(command, commander) {
  if (command === 'serve') {
    command = 'build';
  }
  return this.runUserMethod(command + 'Options', [commander], false);
};

/**
 * Run build  script
 *
 * @param {Object} options Command options
 * @returns {Promise}
 * @deprecated
 */
Config.prototype.runBuild = function(options) {
  return this.launch('build', options);
};

/**
 * Run deploy  script
 * 
 * @param {Object} options Command options
 * @returns {Promise}
 * @deprecated
 */
Config.prototype.runDeploy = function(options) {
  return this.launch('deploy', options);
};

/**
 * Launch a user defined method with all the plugins and post scripts
 *
 * @param {string} method
 * @param {Object} options Command options
 * @param {boolean} runPostMethod
 * @returns {Promise}
 */
Config.prototype.launch = function(method, options, runPostMethod) {
  var _runPostMethod = _.isUndefined(runPostMethod) ? true : runPostMethod;
  var userMethod = new Callable(this.config, method, [options]);
  var pluginMethod = new Callable(null, 'launch', [method, options, false]);

  return this.runUserMethod(userMethod, pluginMethod, true)
    .then(function () {
      if (_runPostMethod) {
        return this.runPostMethod(method, options);
      }
    }.bind(this));
};

/**
 * Run the post scripts of a userdefined method
 *
 * @param {String} method Original method name (without post prefix)
 * @param {Object} options Command options
 * @returns {Promise}
 */
Config.prototype.runPostMethod = function(method, options) {
  var postMethodName = 'post' + _.upperFirst(method);

  var postMethod = new Callable(this.config, postMethodName , [options]);
  var pluginPostMethod = new Callable(null, 'runPostMethod', [method, options]);

  return this.runPluginsMethod(pluginPostMethod, true)
    .then(function() {
      return this.runUserMethod(postMethod, null, false);
    }.bind(this));
};


/**
 * Run a method defined in the bam.js of the project
 *
 * Will check if the config is loaded and if the method exists
 *
 * @param {Callable} userMethod Method to call
 * @param {Callable} pluginMethod A plugin method to call before
 * @param {boolean} required If the method must exists
 * @return {Promise}
 */
Config.prototype.runUserMethod = function (userMethod, pluginMethod, required) {

  // retro compatibility
  if (! (userMethod instanceof Callable)) {
    userMethod = new Callable(this.config, arguments[0], arguments[1]);
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

/**
 * Run a method in all the plugins
 *
 * @param {Callable} pluginMethod Method to run
 * @param {boolean} reverse If we must run the methods in the reverse order of the plugin
 * @returns {Promise}
 */
Config.prototype.runPluginsMethod = function(pluginMethod, reverse) {

  if (! (pluginMethod instanceof Callable) ) {
    pluginMethod = new Callable(null, arguments[0], arguments[1]);
    reverse = arguments[2];
  }

  function callPlugin (plugin) {
    pluginMethod.object = plugin;
    return pluginMethod.call();
  }

  if (reverse) { 
    return Promise.eachRight(this.plugins, callPlugin);
  }
  return Promise.each(this.plugins, callPlugin);
};

module.exports = Config;
module.exports.defaultConfigFileName = defaultConfigFileName;
