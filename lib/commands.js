var commander = require('commander');
var _ = require('lodash');
var Promise = require('bluebird');

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
 * Parse the command args
 * @param {Array} argv
 * @return {Promise} Resolved to Options
 */
Commands.prototype.getBuildOptions = function(argv) {
  var program = new commander.Command();

  return this.loadConfig()
    .then(function (config) {

      program
        .version(this.getVersion())
        .option('-e, --env <env>', 'Environment [staging]', /^(prod|staging)$/i, 'staging');

      return config.buildOptions(program);
    }.bind(this))

    .then(function () {
      program.parse(argv || process.argv);
      return program;
    });
};


/**
 * Parse the run install command args
 * @param {Array} argv
 * @return {Promise} Resolved to Options
 */
Commands.prototype.getInstallOptions = function(argv) {
  var program = new commander.Command();

  return this.loadConfig()
    .then(function (config) {

      program
        .version(this.getVersion())
        .option('-s, --setup', 'Do all setup action (rename folder, fetch linked, ...)');

      return config.buildOptions(program);
    }.bind(this))

    .then(function () {
      program.parse(argv || process.argv);
      return program;
    });
};

/**
 * Run the build command
 * @param {Object} options Parsed options
 * @return {Promise}
 */
Commands.prototype.runBuild = function(options) {
  return this.loadConfig()
    .then(function(config) {
      return config.runBuild(options);
    });
};

/**
 * Run the deploy command
 * @param {Object} options Parsed options
 * @return {Promise}
 */
Commands.prototype.runDeploy = function(options) {
  return this.loadConfig()
    .then(function(config) {
      return config.runDeploy(options);
    });
};

/**
 * Run the install command
 * @param {Object} options Parsed options
 * @return {Promise}
 */
Commands.prototype.runInstall = function(options) {
  return this.loadConfig()
    .then(function(config) {
      if (options.setup) {
        return bamCmd.setupProject(process.cwd(), config, options);
      } else {
        return bamCmd.runInstall(config, options);
      }
    });
};

/**
 * Run the Install command
 * @param {Array} argv The plain command options
 * @return {Promise}
 */
Commands.prototype.install = function(argv) {
  console.log('Run Install'.cyan);

  return this.getInstallOptions(argv)
    .then(function(options) {
      return this.runInstall(options);
    }.bind(this))

    .catch(function (err) {
      console.error((err + '').red);
      console.error('Abording.'.red);
      process.exit(1);
    });
};

/**
 * Run the Build command
 * @param {Array} argv The plain command options
 * @return {Promise}
 */
Commands.prototype.build = function(argv) {
  console.log('Run Build'.cyan);

  return this.getBuildOptions(argv)
    .then(function(options) {
      return this.runBuild(options);
    }.bind(this))

    .catch(function (err) {
      console.error((err + '').red);
      console.error('Abording.'.red);
      process.exit(1);
    });
};

/**
 * Run the Deploy command
 * @param {Array} argv The plain command options
 * @return {Promise}
 */
Commands.prototype.deploy = function(argv) {
  var options = null;
  console.log('Run Deploy'.cyan);


  return this.getBuildOptions(argv)
    .then(function(_options) {
      options = _options;

      if (! options.build) {
        return Promise.resolve();
      }

      return this.runBuild(options);
    }.bind(this))

    .then(function() {
      return this.runDeploy(options);
    }.bind(this))

    .catch(function (err) {
      console.error((err + '').red);
      console.error('Abording.'.red);
      process.exit(1);
    });
};

module.exports = Commands;
