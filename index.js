var rift = require('./rift');
var RiftError = require('./rift_error');
var defaultApi = rift();
var apis = {};

var api = function(apiName) {
  if (!apiName) {
    return defaultApi;
  }
  if (!(apiName in apis)) {
    apis[apiName] = rift();
  }
  return apis[apiName];
};
api.RiftError = RiftError;

module.exports = api;
