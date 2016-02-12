var ConfigManager = require('./config');
var Promise = require('bluebird');
var childProcess = require('child_process');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');

var bamCmd = {};
module.exports = bamCmd;

var Commands = require('./commands');

/**
 * Load a new config file
 * @param {string} path Path of the config file (default ./bam.js)
 * @return {Promise} Resolved to a config Manager
 */
bamCmd.loadConfig = function (path) {
  return (new ConfigManager(path)).load();
};

/**
 * Create a new command object
 * @param env
 * @param {Array} argv Plain command arg
 * @returns {Commands}
 */
bamCmd.createCommand = function(env, argv) {
  return new Commands(env, argv);
};

/**
 * Load the Bam config file contains in a dir if there is one
 * @param {string} dir Dir where file should be located
 * @return {Promise} Resolved by a configManager, rejected if not found
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
    finalDir,
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
 * @return {Promise} resolve to the final dir of the project
 */
bamCmd.renameProjectDir = function(currentDir, optionalConfig) {

  if (!currentDir) {
    currentDir = '.';
  }

  var configPromise;
  if (!optionalConfig) {
    configPromise = this.loadFromDir(currentDir);
  } else {
    configPromise = Promise.resolve(optionalConfig);
  }

  return configPromise.then(function(config) {
    var finalDir = config.getDirName();
    if (! finalDir || finalDir === currentDir) {
      return path.resolve(currentDir);
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
  return Promise.all(promises);
};

/**
 * Run the install script of the project using a new command
 * @param {string} dir Directory of the project
 */
bamCmd.runSetupProjectCommand = function(dir) {
  var script = path.resolve(__dirname, '..', 'bin', 'bam-run-install');
  childProcess.fork(script, ['-s'], {
    cwd: dir,
  });
};

/**
 * Run the install function of the config file
 * @param {Config} config Config object of the project
 * @param {Object} options Function options
 * @return {Pormise}
 */
bamCmd.runInstall = function(config, options, ignorePostInstall) {
  return config.runInstall(options, false, ignorePostInstall);
};

/**
 * Run npm install on a project
 * @param {String} projectDir Directory of the project
 * @return {Promise}
 */
bamCmd.installNodeDependencies = function(projectDir) {
  try {
    fs.statSync(path.join(projectDir, 'package.json'));
    console.log('Running npm install'.cyan);

    return this.spawn('npm', ['install'], {
      cwd: projectDir,
      stdio: 'inherit',
    });
  } catch (e) {
    return Promise.resolve();
  }
};


/**
 * Do all the setup operation depending on the config file
 *
 * Rename the directory, fetch linked repositories and run user scripts
 *
 * @param {String} initialDir Directory where the project is installed
 * @param {Object} config Configuration of the project
 * @param {Object} options Options for the install command 
 *
 * @return {Promise}
 */
bamCmd.setupProject = function(initialDir, config, options) {
  var dontInstallLinked = ! _.get(options, 'installLinked', true);
  var dest = path.resolve(initialDir, '..');

  // Change the cwd for the project if needed
  if (path.resolve(process.cwd()) != path.resolve(initialDir)) {
    return bamCmd.runSetupProjectCommand(initialDir, config, options);
  }

  return bamCmd.renameProjectDir(initialDir, config)

    .then(function() {
      if (dontInstallLinked) {
        return bamCmd.runInstall(config, options, true);
      }
      return Promise.all([
        this.fetchLinkedRepos(config, dest),
        bamCmd.runInstall(config, options, true),
      ]);
    }.bind(this))

    .then(function() {
      return config.runPostInstall(options);
    }.bind(this));
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

  return this.cloneRepository(name, null, dest)
    .then(function(finalDest) {
      clonedDir = finalDest;
      return this.installNodeDependencies(clonedDir);
    }.bind(this))

    .then(function() {
      return this.loadFromDir(clonedDir);
    }.bind(this))

    .then(function(config) {
      return this.setupProject(clonedDir, config, {installLinked: ! dontInstallLinked});
    }.bind(this), function(err) {
      if (shouldHaveBam) {
        return Promise.reject(err);
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
  var resDefer = Promise.defer();
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
    stdio: 'inherit',
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

  var urlRegexp = /(([a-z\-\.]+)\.git)|([a-z\-\.]+(?!\.git))\/?$/i;
  var matches = urlRegexp.exec(url);

  if (!matches) {
    throw new Error('Invalid Repository url : ' + url);
  }
  return matches[2] || matches[3];
};



