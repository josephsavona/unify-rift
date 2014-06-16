// immediately load and configure the promise library for better debugging
var Promise = require('bluebird');
Promise.longStackTraces();

var rift = require('./src/rift');
var RiftError = require('./src/rift_error');
var RiftRequestError = require('./src/rift_request_error');
var RiftXHR = require('./src/rift_xhr');
var RiftWebSocket = require('./src/rift_websocket');
var RiftResolver = require('./src/resolver');
var RiftTest = require('./src/test_helper');

var defaultApi = rift();
var apis = {};
var sharedInstance = null;

var api = function(apiName) {
  // return shared instance if no apiName given
  if (!apiName) {
    if (!sharedInstance) {
      sharedInstance = rift();
      sharedInstance.registerResolver(RiftResolver);
      sharedInstance.use(RiftXHR());
    }
    return sharedInstance;
  }

  if (!(apiName in apis)) {
    apis[apiName] = rift();
  }
  return apis[apiName];
};


api.RiftError = RiftError;
api.RiftRequestError = RiftRequestError;
api.RiftXHR = RiftXHR;
api.RiftWebSocket = RiftWebSocket;
api.RiftResolver = RiftResolver;
api.RiftTest = RiftTest;

module.exports = api;
