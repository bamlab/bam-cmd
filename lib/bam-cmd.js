
var ConfigManager = require('./config.manager');
var $q = require('bluebird');
var childProcess = require('child_process');
var path = require('path');
var fs = require('fs');

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
 * Load the Bam config file contains in a dir if there is one
 * @param {string} dir Dir where file should be located
 * @return {Promise} Resolved by a configManager, refejected if not found
 */
bamCmd.loadFromDir = function(dir) {
  var filename = ConfigManager.defaultConfigFileName;
  var configPath = path.resolve(dir, filename);
  return bamCmd.loadConfig(configPath);
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
bamCmd.cloneRepository = function(repoName, directory, parentDirectory) {
  var fullUrl = this.getFullGitUrl(repoName);
  var repoDir= directory ? directory : this.getRepositoryName(fullUrl);
  var finalDir = path.resolve(parentDirectory || '.', repoDir);

  var args  = [
    'clone',
    '--recursive',
    fullUrl,
    finalDir
  ];

  console.log(('Cloning the repository ' + fullUrl + ' ...').cyan);
  return bamCmd.run('git', args).then(function(){
    console.log(('done ' + fullUrl).cyan);
    return finalDir;
  });
};

/**
 * Rename a project using the dirName config
 * Do nothing if no dirName specified
 * @param {string} currentDir Dir of the project
 * @param {ConfigManager} optionalConfig Config of the project, if not specified, load it
 * @return {string} final dir of the project
 */
bamCmd.renameProjectDir = function(currentDir, optionalConfig) {

  if (!currentDir) {
    currentDir = '.';
  }

  var configPromise;
  if (!optionalConfig) {
    configPromise = this.loadFromDir(currentDir);
  } else {
    configPromise = $q.resolve(optionalConfig);
  }

  return configPromise.then(function(config) {
    var finalDir = config.getDirName();
    if (! finalDir) {
      return;
    }

    finalDir = path.resolve(currentDir, '..', finalDir);
    fs.renameSync(currentDir, finalDir);
    return finalDir;
  });
};

/**
 * Clone and install all the linked repo of a project
 * @param {ConfigManager} config Config of the parent project
 * @param {string} baseDir Directory where all the repository will be installed
 * @returns {Array} Promises for each project
 */
bamCmd.fetchLinkedRepos = function(config, baseDir) {
  var repos = config.getLinkedRepos();
  var promises = [];

  repos.forEach(function(name) {
    var promise = this.installProject(name, baseDir, true, true)
      .catch(function (err) {
        console.error(('Error installing ' + name).red);
        console.error((err + '').red);
      });
    promises.push(promise);
  }.bind(this));
  return promises;
};

/**
 * Run the install script of the project using a new command
 * @param {string} dir Directory of the project
 */
bamCmd.runInstallScript = function(dir) {
  var script = path.resolve(__dirname, '..', 'bin', 'bam-run-install');
  childProcess.fork(script, {
    cwd: dir
  });
};


/**
 * Clone a repository and run installation scripts
 * @param {string} name Name of the repository
 * @param {string} dest Directory where install the project
 * @param {boolean} shouldHaveBam If yes, the promise will be rejected if the repository don't have a bam script
 * @param {boolean} dontInstallLinked Set to true to not install linked repositories
 * @return {Promise}
 */
bamCmd.installProject = function(name, dest, shouldHaveBam, dontInstallLinked) {

  var clonedDir;
  var finalDir;

  return this.cloneRepository(name, null, dest)
    .then(function(finalDest) {
      clonedDir = finalDest;

      return this.loadFromDir(clonedDir);
    }.bind(this))

    .then(function(config) {
      return bamCmd.renameProjectDir(clonedDir, config)
        .then(function(renamedDir) {
          finalDir = renamedDir;

          if (dontInstallLinked) {
            return $q.resolve();
          }

          return $q.all(this.fetchLinkedRepos(config, dest))
        }.bind(this))

        .then(function() {
          return this.runInstallScript(finalDir);
        }.bind(this));

    }.bind(this), function(err) {
      if (shouldHaveBam) {
        return $q.reject(err);
      }
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
 * @param {string} url
 * @return {string} RepoName
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
