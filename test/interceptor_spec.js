var test = require('tap').test;
var rift = require('../index');
var RiftError = rift.RiftError;
var api = rift();
var client = require('./test.rift');
var nock = require('nock');

// record http traffic
// nock.recorder.rec();

api.config.set('base', '/api');
api.config.define(client);

test('should call "before" interceptors', function(t) {
  nock('http://localhost:80')
  .get('/api/testBefore?allowed=allowedParam&options[perPage]=25')
  .reply(200, '[1]',
    { server: 'nginx/1.4.5',
      date: 'Sun, 02 Mar 2014 20:03:06 GMT',
      'content-type': 'application/json',
      'content-length': '15',
      connection: 'close' });

  t.plan(3);
  api.testBefore({
    allowed: 'allowedParam',
    notAllowed: 'notAllowedParam'
  })
  .then(function(results) {
    t.ok(results);
    t.equal(results.length, 1);
    t.equal(results[0], 1);
  })
  .catch(function(err) {
    t.notOk(err, 'should not have error');
  })
  .finally(t.end.bind(t));
});

test('should call "after" interceptors', function(t) {
  nock('http://localhost:80')
  .get('/api/testAfter')
  .reply(200, '[]',
    { server: 'nginx/1.4.5',
      date: 'Sun, 02 Mar 2014 20:03:06 GMT',
      'content-type': 'application/json',
      'content-length': '15',
      connection: 'close' });

  t.plan(3);
  api.testAfter({})
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


test('should call "after" interceptors', function(t) {
  nock('http://localhost:80')
  .get('/api/testCatch')
  .reply(403, "<html>\r\n<head><title>403 Forbidden</title></head>\r\n<body bgcolor=\"white\">\r\n<center><h1>403 Forbidden</h1></center>\r\n<hr><center>nginx/1.4.5</center>\r\n</body>\r\n</html>\r\n",
    { server: 'nginx/1.4.5',
      date: 'Sun, 02 Mar 2014 20:03:06 GMT',
      'content-type': 'text/html',
      'content-length': '168',
      connection: 'close' });

  t.plan(2);
  api.testCatch({})
  .then(function(results) {
    t.notOk(results);
  })
  .catch(function(err) {
    t.ok(err, 'should have error');
    t.equal(err.customProperty, 'customProperty', 'should have custom property from "catch" interceptor');
  })
  .finally(t.end.bind(t));
});
