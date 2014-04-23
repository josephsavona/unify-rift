var test = require('tap').test;
var rift = require('../index');
var RiftError = rift.RiftError;
var RiftRequestError = rift.RiftRequestError;
var RiftXHR = rift.RiftXHR;
var RiftResolver = rift.RiftResolver;
var client = require('./test.rift');
var nock = require('nock');
var Promise = require('bluebird');

// record http traffic
// nock.recorder.rec();

var api = rift();
api.set('base', '/api');
api.define(client);
api.use(RiftXHR);
api.registerResolver(RiftResolver);

test('before filter can alter query params', function(t) {
  nock('http://localhost:80')
  .get('/api/testBefore?allowed=allowedParam&options[perPage]=25')
  .reply(200, '[1]',
    { server: 'nginx/1.4.5',
      date: 'Sun, 02 Mar 2014 20:03:06 GMT',
      'content-type': 'application/json',
      'content-length': '15',
      connection: 'close' });

  api.use('before', function(request, defer) {
    delete request.params.notAllowed;
    request.params.options = request.params.options || {
      perPage: 25
    };
  });
  api.set('after', null);

  t.plan(3);
  api.request('testBefore', {
    allowed: 'allowedParam',
    notAllowed: 'notAllowedParam'
  })
  .then(function(results) {
    t.ok(results);
    t.equal(results.length, 1);
    t.equal(results[0], 1);
  })
  .catch(function(err) {
    console.error(err);
    t.notOk(err, 'should not have error');
  })
  .finally(t.end.bind(t));
});

test('before filter can reject request before xhr', function(t) {
  api.set('before', function(request, defer) {
    defer.reject(new RiftError('rejected!'));
  });
  api.set('after', null);

  t.plan(2);
  api.request('testBefore', {})
  .then(function(results) {
    t.notOk(results, 'should not have results');
  })
  .catch(function(err) {
    t.ok(err);
    t.equal(err.message, 'rejected!');
  })
  .finally(t.end.bind(t));
});

test('before filter can resolve request before xhr', function(t) {
  api.set('before', function(request, defer) {
    return Promise.delay(10)
    .then(function() {
      defer.resolve('resolved!');
    })
  });
  api.set('after', null);

  t.plan(2);
  api.request('testBefore', {})
  .then(function(results) {
    t.ok(results);
    t.equal(results, 'resolved!');
  })
  .catch(function(err) {
    t.notOk(err, 'should not have error');
  })
  .finally(t.end.bind(t));
});

test('after filter can modify response body', function(t) {
  nock('http://localhost:80')
  .get('/api/testAfter')
  .reply(200, '[]',
    { server: 'nginx/1.4.5',
      date: 'Sun, 02 Mar 2014 20:03:06 GMT',
      'content-type': 'application/json',
      'content-length': '15',
      connection: 'close' });

  api.set('before', null);
  api.set('after', function(request, defer) {
    if (!request.body || !request.body.length) {
      request.body = [{ok:false}];
    }
  });

  t.plan(3);
  api.request('testAfter', {})
  .then(function(results) {
    t.ok(results);
    t.equal(results.length, 1);
    t.deepEqual(results[0], {ok:false});
  })
  .catch(function(err) {
    t.notOk(err, 'should not have error');
  })
  .finally(t.end.bind(t));
});


test('after filter can modify response error', function(t) {
  nock('http://localhost:80')
  .get('/api/testCatch')
  .reply(403, "<html>\r\n<head><title>403 Forbidden</title></head>\r\n<body bgcolor=\"white\">\r\n<center><h1>403 Forbidden</h1></center>\r\n<hr><center>nginx/1.4.5</center>\r\n</body>\r\n</html>\r\n",
    { server: 'nginx/1.4.5',
      date: 'Sun, 02 Mar 2014 20:03:06 GMT',
      'content-type': 'text/html',
      'content-length': '168',
      connection: 'close' });

  api.set('before', null);
  api.set('after', function(request, defer) {
    return Promise.delay(10)
    .then(function() {
      if (request.error) {
        request.error.customProperty = 'customProperty';
      }
    })
  });

  t.plan(2);
  api.request('testCatch', {})
  .then(function(results) {
    t.notOk(results);
  })
  .catch(function(err) {
    t.ok(err, 'should have error');
    t.equal(err.customProperty, 'customProperty', 'should have custom property from "catch" interceptor');
  })
  .finally(t.end.bind(t));
});
