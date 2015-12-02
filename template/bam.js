/*
 * This file is a configuration for the bam command line tool
 * @see https://github.com/bamlab/bam-cmd
 */

var exec = require('child_process').exec;

module.exports = {
	scriptVersion: '0.1.0',
	dirName: 'repository-dir-name'
	linkedRepos: [],
	install: function() {
		// run at the installation. Do not accept any argument
		exec('npm install', function(err, stdin, stderr) {
			console.log(stdin);	
		});
	},
};
