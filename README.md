unify-rift
==========

Thrift-like API generator for client and server

## Usage

### Client Configuration

Configure the client in your main application entry point:

    // generated api wrapper
    var api = require('./gen/api');
    // generated api client
    var client = require('./gen/api-client');
    // delegate calls to the server
    // via the generated client wrapper
    api.delegate(client);

### Server Configuration

Configure the server before loading the api consumer code:

    // generated api wrapper
    var api = require('./gen/api');
    // your implementation of the api method calls
    var server = require('./lib/api');
    // delegate calls to the implementation
    api.delegate(server);

    // for a connect-compatibile app,
    // serve the api for the client
    var rift = require('node-rift');
    app.use(rift.middlware(api, {
      baseUrl: '/api'
    }));

For non-connect servers, you can use api.config to retrieve
the route information including url and method of each route,
and manually configure your server to route them.


### Defining & Implementing the API

The API is only implemented on the server. It should be a plain object
where keys match those specified in the api definition file:

API definition:

    // sample.rift.js
    module.exports = {
      routeName: {
        method: 'get',
        url: '/route/test'
      }
    }

API implementation

    // sample.js
    module.exports = {
      routeName: function(params, callback) {
        doSomething(function(err, result) {
          if (err) return callback(err);
          callback(null, result);
        })
      }
    }


### Using the API

In your application code, retrive the configured instance:

    // retrieve the code configured earlier
    var api = require('./gen/api');
    // call a method
    api.someMethod('input', function(err, output) {
      // ... do stuff
    })
