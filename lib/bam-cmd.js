
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

/**
 * Return the script config
 * @todo Use a ~/.bamrc file
 * @returns {{defaultBaseUrl: string, defaultUrlFolder: string}}
 */
bamCmd.loadScriptConfig = function() {
  return {
    defaultBaseUrl: 'git@github.com:',
    defaultUrlFolder: 'bamlab/',
  };
};

/**
 * Clone a repository
 * @param {string} repoName Repository Name
 * @param {string} directory Target directory (optional)
 */
bamCmd.cloneRepository = function(repoName, directory) {
  var fullUrl = this.getFullGitUrl(repoName);
  var repoDir= directory ? directory : this.getRepositoryName(fullUrl);

  var args  = [
    'clone',
    '--recursive',
    fullUrl,
    repoDir
  ];

  console.log(('Cloning the repository ' + fullUrl + ' ...').cyan);
  return bamCmd.run('git', args).then(function(){
    console.log(('done ' + fullUrl).cyan);
    return repoDir;
  });
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


/**
 * Complete an url with default options to have a full git repo url
 * @param {string} url
 * @returns {string}
 */
bamCmd.getFullGitUrl = function (url) {
  var scriptConfig = this.loadScriptConfig();

  // could be a protocol://domain or a scp-like user@domain: url
  if (url.indexOf(':') !== -1) {
    return url;
  }

  // the directory is specified
  if (url.indexOf('/') !== -1) {
    return scriptConfig.defaultBaseUrl + url;
  }

  var pathToRepo = scriptConfig.defaultBaseUrl + scriptConfig.defaultUrlFolder;
  pathToRepo += (pathToRepo.charAt(pathToRepo.length - 1) === '/') ? '' : '/';

  return pathToRepo + url + ((url.indexOf('.git', url.length - 4) !== -1) ? '' : '.git');
};

/**
 * Get the name of a repository from the full url
 * @param return
 *
 */
bamCmd.getRepositoryName = function(url) {

  var urlRegexp = /(([a-z\-\.]+)\.git)|([a-z\-\.]+(?!\.git))\/?$/;
  var matches = urlRegexp.exec(url);

  if (!matches) {
    throw new Error('Invalid Repository url : ' + url);
  }
  return matches[2] || matches[3];
};


module.exports = bamCmd;
