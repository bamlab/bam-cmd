Build Automation Manager
======================

![Build status](https://img.shields.io/circleci/project/bamlab/bam-cmd/master.svg)
![Release](https://img.shields.io/github/release/bamlab/bam-cmd.svg)
![Climate](https://img.shields.io/codeclimate/github/bamlab/bam-cmd.svg)
![Coverage](https://img.shields.io/codeclimate/coverage/github/bamlab/bam-cmd.svg)

Make automatic build and install with a single command interface and plugins.


## Running the test

You can run the tests with 
```
   npm test
```

If you want to generate the code coverage, use :
```
./node_modules/istanbul/lib/cli.js cover --dir ./coverage ./node_modules/mocha/bin/_mocha -- test
```
