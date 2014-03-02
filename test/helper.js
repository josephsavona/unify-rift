var rift = require('../index');
var async = require('async');
var path = require('path');

// compiled api dependencies
var superagent = require('superagent');
var qs = require('qs');

// sample api
var apiDefinition = require('./test.rift.js');
var serverApi;
var clientApi;
var client;
var initialized = false;

var done = function(cb) {
  cb(null, {
    serverApi: serverApi,
    clientApi: clientApi,
    client: client
  });
};

// from http://stackoverflow.com/a/17585470/73547
function requireFromString(src, filename) {
  var Module = module.constructor;
  var m = new Module();
  m.paths = module.paths;
  filename = path.resolve(__dirname, filename);
  m._compile(src, filename);
  return m.exports;
}

module.exports = function(cb) {
  if (initialized) {
    return done(cb);
  }

  async.parallel({
    api: rift.generateApi.bind(rift, apiDefinition),
    client: rift.generateClient.bind(rift, apiDefinition)
  }, function(err, results) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    clientApi = requireFromString(results.api, 'client-api.js');
    client = requireFromString(results.client, 'client-delegate.js');
    serverApi = requireFromString(results.api, 'server-api.js');
    initialized = true;
    done(cb);
  });
};
