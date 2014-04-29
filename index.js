// immediately load and configure the promise library for better debugging
var Promise = require('bluebird');
Promise.longStackTraces();

var rift = require('./src/rift');
var RiftError = require('./src/rift_error');
var RiftRequestError = require('./src/rift_request_error');
var RiftXHR = require('./src/rift_xhr');
var RiftWebSocket = require('./src/rift_websocket');
var RiftResolver = require('./src/resolver');

var defaultApi = rift();
var apis = {};
var sharedInstance = null;

var api = function(apiName) {
  if (!apiName) {
    return sharedInstance ? sharedInstance : sharedInstance = rift();
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

module.exports = api;
