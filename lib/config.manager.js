
var $q = require('bluebird');
var fs = require('fs');
var path = require('path');
var versionCmp = require('node-version-compare');

var stat = $q.promisify(fs.stat);

function ConfigManager(configPath) {
	if (! (this instanceof ConfigManager)) {
		return new ConfigManager(configPath);
	}
	
	this.configPath = configPath || './bam.js';
	this.config = null;
}


ConfigManager.prototype.load = function () {
	return this.loadFile(this.configPath);	
};

ConfigManager.prototype.loadFile = function (configPath) {
	this.configPath = path.resolve(configPath || './bam.js');

	return stat(this.configPath)
		.then((function(stats) {
			if (! stats.isFile()) {
				return $q.reject();
			}
			this.config = require(this.configPath);
			return this;
		}).bind(this)).catch((function(e) {
			return $q.reject('BAM configuration ' + this.configPath + ' not found');
		}).bind(this));
};

ConfigManager.prototype.checkValidSync = function() {
	if (this.config === null) {
		throw Error('Configuration not loaded');
	}

	var version = this.config.scriptVersion;
	// @todo get package.json version
	if (versionCmp(version, '0.1.0') > 0) {
		throw Error('The project need a highter version of the bam script : ' + version);
	}
};

ConfigManager.prototype.checkValid = function(forwardedParam) {
	try {
		this.checkValidSync();
		return $q.resolve(forwardedParam);
	} catch (e) {
		return $q.reject(e);
	}
}

ConfigManager.prototype.getDirName = function() {
	this.checkValidSync();
	return this.config.dirName;
}

ConfigManager.prototype.getLinkedRepos = function() {
	this.checkValidSync();
	var repos = this.config.linkedRepos;
	if (! repos) {
		repos = [];
	}
	return repos;
}

ConfigManager.prototype.runInstall = function(options) {
	return this.checkValid()
		.then((function() {
			return this.config.install(options);
		}).bind(this));		
}

module.exports = ConfigManager;
