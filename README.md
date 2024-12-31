> **⚠️ Archived Repository**
>
> This repository has been **archived** and is no longer actively maintained.  
> Feel free to explore the code and use it as needed, but note that no updates or support will be provided.


Build Automation Manager
======================

Make automatic build and install with a single command interface and plugins.

## Installation

To install the bam command, just run in a terminal :
```
npm install -g git@github.com:bamlab/bam-cmd.git
```

If you want to fix the version to use in a particular project, just install it locally :
```
npm install --save-dev git@github.com:bamlab/bam-cmd.git
```

## Quick Start

BAM give you great tools to create an installation, a build and a deploy script for your project.

To start using it, just write in your main directory :
```
bam init
```

A new file `bam.js` will be created with some bootstrap code. This is where you will configure the command.
It should return a plain object with the configuration options for the command.

### Build and Deploy

The BAM command have 2 subcommand for building and deploying. This is :
```
bam build [-e <env>]
bam deploy [-e <env>]
```

When a developer use its in your project folder, the methods `build` and `deploy` of your option object will be called.
The method can accept as parameter an object with the command line options.

If you want to accept extra parameters from the command line, you can use the `buildOptions` methods. It accept a Commander object.


Example :
```
$ cat bam.js

module.exports = {
  buildOptions: function(commander) {
	commander.option('-d --doge', 'Doge');
  },
  build: function(options) {
    console.log('In Build script');
    console.log(options.env);
	console.log(options.doge);
  },
  deploy: function(options) {
    console.log('In Deploy Script');
  }
};

$ bam build
Run Build
In Build script
staging
undefined

$ bam build -e prod -d
Run Build
In Build script
prod
true

$ bam deploy
Run Deploy
In Deploy Script
```

### Installation script

BAM provide a command to install a project from scratch. The only thing the user has to do is to place in an empty directory and to run:
```
bam install git@github.com:yourUser/yourRepo.git
```

The command will do the following action :
1. clone your repository with `git` in a new directory.
2. Run `npm install` if your project contains a `package.json` file
3. Look for a `bam.js` or a `bam.json` file and load it.
4. Rename your project folder with the content of the `dirName` option
5. Do the same actions with all the project given in the `linkedRepos` option
6. Run your installation method

The step 2 allows you to require some locally installed script at the beginning of your `bam.js` file.

If you have more one repository for your entire project (like a back, a front and a provisioning) you can use the `linkedRepos` configuration. It is simply an array of repository names.

## Reference

### Commands

```
bam install [repoName]  Install a repository
bam deploy [env]        Deploy project on servers or the store
bam build               Build a project or an app
bam init                Create an empty bam.js
bam run-install         Run the install script of the project
bam help [cmd]          display help for [cmd]
```

The repository name could be specified in all accepted git format. The command accept the following format : 
* `orga/package.git` will be used as `git@github.com:orga/package.git` 
* `package.git` will be used as `git@github.com:bamlab/package.git`
* `orga/package` will be used as `git@github.com:orga/package.git` 
* `package` will be used as `git@github.com:bamlab/package.git` 

### Project Configuration

The configuration must be in a file named `bam.js` in your project directory. It must export an object which could have the following attributes :

**build**

type: `function(config)` or `string`

params:
+ config : [Commander](https://github.com/tj/commander.js) object with the parsed command arguments

The script to run for building the project.

**deploy**

type: `function(config)` or `string`

params:
+ config : [Commander](https://github.com/tj/commander.js) object with the parsed command arguments

The script to run for deploying the project.

**install**

type: `function()` or `string`

The script to run for installing the project. When the function is called, the `npm install` command has already been run if needed.

You cannot assume in this method than the linked repositories are installed. It will be run at the same times as the 
clones

**postInstall**

type: `function()` or `string`

This method is run at the end of the clone and installation of all the liked repositories.

**dirName**

type: `String`

The name of the project directory. If undefined or blank, the porject dir will not been renamed.

**linkedRepos**

type: `Array` of `string`

List of linked repository to install in the same parent folder of the project. Usefull when the back, the front and the provisionning are in different repositories. The names must have the same form than in the `bam install` command.

At the project installation, the will do the same actions than the `bam install` command on each project. The only two differences are :

1. If no `bam.js` file is fould, no error is throwed.
2. The linked repositories are not recursively installed


## Running the test

You can run the tests with
```
   npm test
```

If you want to generate the code coverage, use :
```
./node_modules/istanbul/lib/cli.js cover --dir ./coverage ./node_modules/mocha/bin/_mocha -- test
```
