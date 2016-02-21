require('colors');

module.exports.msg = function(msg, noColor) {
  if (noColor) {
    console.log(msg);
    return;
  }

  console.log((msg + '').cyan);
};

module.exports.error = function(msg) {
  console.error((msg + '').red);
};
