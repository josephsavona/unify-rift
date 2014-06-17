var test = require('tap').test;
var rift = require('../index');

var api = rift(null);
var mock = new rift.RiftTest(api);

test('rift.RiftTest should resolve requests', function(t) {
  var response = {a:1};
  api.request('test')
  .then(function(data) {
    t.equal(data, response, 'should have expected response');
  })
  .catch(function(err) {
    console.warn(err.stack);
    t.notOk(err, 'should not have error');
  })
  .finally(function() {
    t.notOk(mock.hasRequestForTopic('test'), 'should not have requests on this topic');
    t.notOk(mock.hasRequests(), 'should not have requests on any topic');
  })
  .finally(t.end.bind(t));

  t.ok(mock.hasRequestForTopic('test'));
  t.ok(mock.hasRequests());
  mock.resolve('test', response);
});

test('rift.RiftTest should reject requests', function(t) {
  var rejection = new Error();
  api.request('test')
  .then(function(data) {
    t.notOk(false, 'should not resolve');
  })
  .catch(function(err) {
    t.equal(err, rejection, 'should have expected error');
  })
  .finally(function() {
    t.notOk(mock.hasRequestForTopic('test'), 'should not have requests on this topic');
    t.notOk(mock.hasRequests(), 'should not have requests on any topic');
  })
  .finally(t.end.bind(t));

  t.ok(mock.hasRequestForTopic('test'));
  t.ok(mock.hasRequests());
  mock.reject('test', rejection);
});