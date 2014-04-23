var rift = require('./src/rift');
var RiftError = require('./src/rift_error');
var RiftRequestError = require('./src/rift_request_error');
var RiftXHR = require('./src/rift_xhr');
var RiftResolver = require('./src/resolver');

var defaultApi = rift();
var apis = {};

var api = function(apiName) {
  if (!apiName) {
    return rift();
  }
  if (!(apiName in apis)) {
    apis[apiName] = rift();
  }
  return apis[apiName];
};
api.RiftError = RiftError;
api.RiftRequestError = RiftRequestError;
api.RiftXHR = RiftXHR;
api.RiftResolver = RiftResolver;

module.exports = api;
