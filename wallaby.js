module.exports = function () {
  return {
    files: [
      'lib/**/*.js',
      'package.json',
      'test/fixtures/**/*.js',
    ],

    tests: [
      'test/**/*.spec.js',
    ],

    env: {
      type: 'node',
    },
  };
};
