unify-rift
==========

Thrift-like API generator for client/server communication, with a standardized 
API for HTTP and WebSocket.

## Usage

### Client/Browser Configuration

Configure the client in your main application entry point:

    var rift = require('rift');
    var api = rift('api');
    api.use(rift.RiftXHR());
    api.registerResolver(rift.RiftResolver);
    api.define({
        ping: {
            url: '/ping',
            method: 'get',
            client: 'http'
        },
        pong: {
            url: '/pong/:name',
            method: 'post'
            client: 'http'
        }
    });

And then use it in application code:

    // retrieve previously configured instance by name
    var api = require('rift')('api'); 
    api.request('ping')
    .then(function(response) {
        ...
    })
    api.request('pong', {name: 'Tester'})
    .then(function(response) {
        ...
    })

## Middleware Configuration

You may want to provide additional processing beyond the built-in JSON parsing/stringifying.
For example, to implement caching:

    api.use(function(request) {
        return new Promise(function(resolve, reject) {
            // try to find the URL in cache
            asyncCache.get(request.endpoint.url, function(err, response) {
                if (response) {
                    // found: bypass XHR and return immediately to caller
                    response.resolve(response);
                }
                // always resolve the promise you return
                resolve();
            })
        })
    })

Or add some extra params (eg if you're calling an API with header-based auth):

    api.use(function(request) {
        request.params.myAuthToken = 'TOKEN_VALUE';
    })

The `request` param to 'use' is a lightweight request wrapper with the following structure:
    
    request = {
        endpoint: {},           // object with the api definition passed in `define()`
        options: {},            // object with `request()` options merged w/ defaults
        params: {},             // object of params passed to `request()`
        error: null,            // Error object or null
        data: null,             // object of response data or null
        meta: {}                // object of metadata
    }
    // reject the request with the given `err` Error instance.
    request.reject(err);        

    // resolve the request with the given reponse data
    request.resolve(response);

