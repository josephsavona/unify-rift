var Promise = require('bluebird');

module.exports = {
  fail: function(params) {
    return new Promise(function(resolve, reject) {
      reject('error');
    });
  },
  succeed: function(params) {
    return new Promise(function(resolve, reject) {
      resolve(params);
    });
  }
}