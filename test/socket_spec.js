var test                         = require('tap').test;
       rift                         = require('../index'),
       RiftError               = rift.RiftError,
       RiftRequestError = rift.RiftRequestError,
       RiftSocket            = require('../src/rift_socket'),
       RiftResolver         = rift.RiftResolver,
       client                    = require('./test.rift'),
       nock                     = require('nock'),
       sinon                    = require('sinon'),
       Promise                = require('bluebird'),
       server                   = require('./test_socket_server');

// record http traffic
// nock.recorder.rec();

var api = rift();
api.set('base', '/api');
api.define(client);
api.use(RiftSocket);
api.registerResolver(RiftResolver);

test('should make a request using socket', function (t) {
  server.start();

  api.request('socketTest').then(function (response) {
    t.equals(response.data.message, 'socketTest has been received.');
    t.end();
    server.stop();
  }).catch(function () {
    t.end();
    server.stop();
  });
});
