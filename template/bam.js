/*
 * This file is a configuration for the bam command line tool
 * @see https://github.com/bamlab/bam-cmd
 */

var spawn = require('child_process').spawn;

module.exports = {
  dirName: 'repository-dir-name',
  linkedRepos: [],
  install: function() {
    // run at the installation. Do not accept any argument
    spawn('bower', ['install'], {stdio: 'inherit'});
  },
  buildOptions: function(commander) {
    commander
      .option('-d --doge', 'Doge');
  },
  build: function(options) {
    console.log(options.env);
    console.log(options.doge);
  },
  deploy: function(options) {
    console.log(options.env);
    console.log(options.doge);
  }
};
