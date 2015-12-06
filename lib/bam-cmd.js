
var ConfigManager = require('./config.manager');
var $q = require('bluebird');
var childProcess = require('child_process');

var bamCmd = {};

/**
 * Load a new config file
 * @param {string} path Path of the config file (default ./bam.js)
 * @return {Promise} Resolved to a config Manager
 */
bamCmd.loadConfig = function (path) {
  return (new ConfigManager(path)).load();
};



/*****************
 * Utils Functions
 ******************/

/**
 * Promisify the childProcess spawn function
 * @param {string} command
 * @param {Array} args
 * @param {Object} options
 */
bamCmd.spawn = function(command, args, options) {
  var resDefer = $q.defer();
  var cmd = childProcess.spawn(command, args, options);
  cmd.on('close', function (code) {
    if (code !== 0) {
      return resDefer.reject();
    }
    resDefer.resolve();
  });
  return resDefer.promise;
};

/**
 * Tooltip function to run a command in the same terminal
 * @param {string} command
 * @param {Array} args
 */
bamCmd.run = function (command, args) {
  return this.spawn(command, args, {
    stdio: 'inherit'
  });
};

module.exports = bamCmd;
