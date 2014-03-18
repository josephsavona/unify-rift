unify-rift
==========

Thrift-like API generator for client and server

## Usage

### Client Configuration

Configure the client in your main application entry point:

    // core library
    var api = require('unify-rift');
    // your api definition
    var apiDefinition = require('./api.json');
    // delegate calls to the server
    // via the generated client wrapper
    api.config.delegate(apiDefinition);

### Server Configuration

Configure the server before loading the api consumer code:

    // core library
    var api = require('unify-rift');
    // your implementation of the api method calls
    var server = require('./api');
    // delegate calls to the implementation
    api.config.delegate(server);

    // for a connect-compatibile app,
    // serve the api for the client
    var rift = require('node-rift');
    app.use(api.config.router(require('./api.json')));


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
Note: to be compatible on both client & server, your methods must return a promise (eg `bluebird`).

    // sample.js
    module.exports = {
      routeName: function(params) {
        return new Promise(function(resolve, reject) {
          var value;
          // ...async computation...
          resolve(value)
        })
      }
    }


### Using the API

In your application code, retrive the configured instance:

    // retrieve the code configured earlier
    var api = require('unify-rift');
    // call a method
    api.someMethod('input').then(function(results) {
        console.log(results);
    })
    .catch(function(err) {
        console.error(err);
    })
