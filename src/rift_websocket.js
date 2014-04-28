var Promise = require('bluebird'),
  qs = require('qs'),
  _ = require('lodash'),
  util = require('util'),
  RiftError = require('./rift_error'),
  EngineIO = require('engine.io-client');

module.exports = function riftWebSocketMiddleware(options) {
  var socket, fn;
  options = _.defaults(options || {}, {
    hostname: 'http://localhost:80',
    timeout: 1000,
    topicKey: 'name',
    dataKey: 'data'
  });
  socket = new EngineIO.Socket(options.hostname);

  fn = function riftWebSocket(request) {
    var topic;
    if (!request || !request.endpoint || request.endpoint.client !== 'socket') {
        return;
    }
    if (request.isRejected() || request.isResolved()) {
      return;
    }

    topic = request.endpoint.topic;
    return new Promise(function (resolve) {
      var sendMsg = {};
      sendMsg[options.topicKey] = topic;
      sendMsg[options.dataKey] = request.params;

      socket.send(JSON.stringify(sendMsg));
      socket.on('message', function(response) {
        var msg;
        try {
          msg = JSON.parse(response);
        } catch (e) {
          request.reject(new RiftError('Invalid WebSocket response'));
          return resolve();
        }
        if (!msg || !(options.topicKey in msg)) {
          return;
        }
        if (msg[options.topicKey] === request.endpoint.successTopic) {
          if (options.dataKey in msg) {
            request.resolve(msg[options.dataKey]);
            return resolve();
          } else {
            request.reject(new RiftError('No data in WebSocket response'));
            return resolve();
          }
        } else if (msg[options.topicKey] === request.endpoint.failureTopic) {
          request.reject(new RiftError('WebSocket failure received'));
          return resolve();
        }
      });
    })
    .timeout(options.timeout, util.format('WebSocket request timed out after %s ms', options.timeout));
  };

  fn.close = socket.close.bind(socket);

  return fn;
};