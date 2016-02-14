
var childProcess = require('child_process');
var Promise = require('bluebird');


/**
 * Tooltip function to run a command in the same terminal
 * @param {string} command
 * @param {Array} args
 */
function run (command, args) {
  return spawn(command, args, {
    stdio: 'inherit',
  });
}

/**
 * Promisify the childProcess spawn function
 * @param {string} command
 * @param {Array} args
 * @param {Object} options
 */
function spawn(command, args, options) {
  var resDefer = Promise.defer();
  var cmd = childProcess.spawn(command, args, options);
  cmd.on('close', function (code) {
    if (code !== 0) {
      return resDefer.reject();
    }
    resDefer.resolve();
  });
  return resDefer.promise;
}

module.exports = run;
module.exports.spawn = spawn;