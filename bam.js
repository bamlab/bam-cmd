#!/usr/bin/env node

var options = require('commander');
var inquire = require('inquirer');


options
	.version('0.1.0')
  	.option('-p, --peppers', 'Add peppers')
  	.option('-b, --bbq-sauce', 'Add bbq sauce')
  	.option('-c, --cheese [type]', 'Add the specified type of cheese [marble]', 'marble')
  	.parse(process.argv);

console.log(options);

