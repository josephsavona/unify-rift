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

test('before filter can alter query params', function(t) {
  nock('http://localhost:80')
  .get('/api/testBefore?allowed=allowedParam&options[perPage]=25')
  .reply(200, '[1]',
    { server: 'nginx/1.4.5',
      date: 'Sun, 02 Mar 2014 20:03:06 GMT',
      'content-type': 'application/json',
      'content-length': '15',
      connection: 'close' });

  api.config.set('before', function(ctx) {
    delete ctx.params.notAllowed;
    ctx.params.options = ctx.params.options || {
      perPage: 25
    };
  });
  api.config.set('after', null);

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

test('before filter can reject request before xhr', function(t) {
  api.config.set('before', function(ctx) {
    ctx.reject(new RiftError('rejected!'));
  });
  api.config.set('after', null);

  t.plan(2);
  api.testBefore({})
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
  api.config.set('before', function(ctx) {
    ctx.resolve('resolved!');
  });
  api.config.set('after', null);

  t.plan(2);
  api.testBefore({})
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

  api.config.set('before', null);
  api.config.set('after', function(ctx) {
    if (!ctx.body || !ctx.body.length) {
      ctx.body = [{ok:false}];
    }
  });

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


test('after filter can modify response error', function(t) {
  nock('http://localhost:80')
  .get('/api/testCatch')
  .reply(403, "<html>\r\n<head><title>403 Forbidden</title></head>\r\n<body bgcolor=\"white\">\r\n<center><h1>403 Forbidden</h1></center>\r\n<hr><center>nginx/1.4.5</center>\r\n</body>\r\n</html>\r\n",
    { server: 'nginx/1.4.5',
      date: 'Sun, 02 Mar 2014 20:03:06 GMT',
      'content-type': 'text/html',
      'content-length': '168',
      connection: 'close' });

  api.config.set('before', null);
  api.config.set('after', function(ctx) {
    if (ctx.error) {
      ctx.error.customProperty = 'customProperty';
    }
  });

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
