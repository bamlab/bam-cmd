var commander = require('commander');
var _ = require('lodash');
var Promise = require('bluebird');

var Callable = require('./utils/callable');

require('colors');
var bamCmd = require('./bam-cmd');

var Commands = function(env, argv, config) {
  this.env = env;
  this.argv = argv;
  this.config = null;
  this.plainConfig = config;
};

/**
 * Ge the current script version
 * @return {String}
 */
Commands.prototype.getVersion = function() {
  return require('../package').version;
};

/**
 * Load the config file using the env
 * @return {Promise}
 */
Commands.prototype.loadConfig = function() {
  if (this.config !== null) {
    return Promise.resolve(this.config);
  }
  var promise;
  if (this.plainConfig) {
    promise = bamCmd.loadConfig(this.plainConfig);
  } else if (! _.has(this.env, 'configPath')) {
    promise = bamCmd.loadConfig();
  } else {
    promise = bamCmd.loadConfig(this.env.configPath);
  }

  return promise.then(function(config) {
    this.config = config;
    return config;
  }.bind(this));
};

/**
 * Run a command
 *
 * @param {String} command
 * @return {Promise}
 */
Commands.prototype.runCommand = function(command, argv) {
  console.log(('Run ' + command).cyan);
  var options;

  return this.getOptions(command, argv)
    .then(function(_options) {
      options = _options;
      return this.loadConfig();
    }.bind(this))

    .then(function(config) {
      var runMethod = new Callable(this, 'run' + _.upperFirst(command), [options, config]);
      if (runMethod.exists()) {
        return runMethod.call();
      }

      return config.launch(command, options);
    }.bind(this))
    .catch(this.handleErrors);
};

/**
 *
 * @param command
 * @returns {*}
 */
Commands.prototype.getOptions = function(command, argv) {
  var program = new commander.Command();

  return this.loadConfig()
    .then(function (config) {

      program
        .version(this.getVersion());

      var optionsMethod = new Callable(this, '_get' + _.upperFirst(command) + 'Options', [program]);
      if (optionsMethod.exists()) {
        optionsMethod.call();
      }

      return config.getOptions(command, program);
    }.bind(this))

    .then(function () {
      program.parse(argv || process.argv);
      return program;
    });
};

/**
 * Run the deploy command
 * @param {Object} options Parsed options
 * @return {Promise}
 */
Commands.prototype.runDeploy = function(options, config) {
  if (! options.build) {
    return config.launch('deploy', options);
  }

  return config.launch('build', options)
    .then(function() {
      return config.launch('deploy', options);
    });
};

/**
 * Run the install command
 * @param {Object} options Parsed options
 * @return {Promise}
 */
Commands.prototype.runInstall = function(options, config) {
  if (options.setup) {
    return bamCmd.setupProject(process.cwd(), config, options);
  }

  return bamCmd.runInstall(config, options);
};



Commands.prototype._getBuildOptions = function(commander) {
  return commander.option('-e, --env <env>', 'Environment [staging]', /^(prod|staging)$/i, 'staging');
};

Commands.prototype._getInstallOptions = function(commander) {
  return commander.option('-s, --setup', 'Do all setup action (rename folder, fetch linked, ...)');
};

Commands.prototype._getDeployOptions = function(commander) {
  return this._getBuildOptions(commander);
};

/**
 * Parse the command args
 * @param {Array} argv
 * @return {Promise} Resolved to Options
 */
Commands.prototype.getBuildOptions = function(argv) {
  return this.getOptions('build', argv);
};

/**
 * Parse the run install command args
 * @param {Array} argv
 * @return {Promise} Resolved to Options
 */
Commands.prototype.getInstallOptions = function(argv) {
  return this.getOptions('install', argv)
};

/**
 * Run the Install command
 * @param {Array} argv The plain command options
 * @return {Promise}
 */
Commands.prototype.install = function(argv) {
  return this.runCommand('install', argv);
};

/**
 * Run the Build command
 * @param {Array} argv The plain command options
 * @return {Promise}
 */
Commands.prototype.build = function(argv) {
  return this.runCommand('build', argv);
};

/**
 * Run the Deploy command
 * @param {Array} argv The plain command options
 * @return {Promise}
 */
Commands.prototype.deploy = function(argv) {
  return this.runCommand('deploy', argv);
};

Commands.prototype.handleErrors = function(err) {
  console.error((err + '').red);
  console.error('Aborting.'.red);
  process.exit(1);
};

module.exports = Commands;
