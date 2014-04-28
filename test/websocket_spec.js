var test = require('tap').test,
  rift = require('../index'),
  RiftError = rift.RiftError,
  RiftRequestError = rift.RiftRequestError,
  RiftSocket = rift.RiftWebSocket,
  RiftResolver = rift.RiftResolver,
  client = require('./test.rift'),
  nock = require('nock'),
  sinon = require('sinon'),
  server = require('./test_websocket_server');

var api = rift();
var socket = RiftSocket({
  hostname: 'http://localhost:' + server.address
})
api.set('base', '/api');
api.define(client);
api.use(socket);
api.registerResolver(RiftResolver);

test('should make a request using socket', function (t) {
  server.start();
  api.request('socketTest', {hello:'world'}).then(function (response) {
    t.equals(response.hello, 'world');
  }).catch(function (err) {
    console.error(err);
    t.notOk(err, 'should not have error');
  }).finally(function() {
    socket.close();
    server.close();
    setTimeout(t.end.bind(t), 500);
  });
});
