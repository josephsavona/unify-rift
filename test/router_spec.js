var test = require('tap').test;
var api = require('../index')();
var client = require('./test.rift');
var server = require('./test');
var request = require('supertest');
var express = require('express');

api.set('base', '/api');
api.define(client);
api.delegate(server);

var app = express();
app.use(app.router);
api.middleware(app);

test('router should return valid response', function(t) {
  t.plan(2);
  var test = request(app)
    .get('/api/succeed?q=1')
    .set('Content-Type', 'application/json')
    .set('X-Requested-With', 'XMLHttpRequest')
    .expect(200)
    .end(function(err, res) {
      console.log('ended')
      t.notOk(err, 'should not have error');
      t.equal(res.body.q, '1', 'response should be correct');
      test.app.close();
      t.end();
    });
});
