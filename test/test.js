var Promise = require('bluebird');

module.exports = {
  fail: function(request, defer) {
    defer.reject('error');
  },
  succeed: function(request, defer) {
    defer.resolve(request.params);
  }
}