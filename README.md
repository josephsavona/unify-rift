unify-rift
==========

Thrift-like API generator for client and server

## Usage

### Client/Browser Configuration

Configure the client in your main application entry point:

    var rift = require('rift');
    var api = rift('api');
    api.config.define({
        ping: {
            url: '/ping',
            method: 'get'
        },
        pong: {
            url: '/pong/:name',
            method: 'post'
        }
    });

And then use it in application code:

    // retrieve previously configured instance by name
    var api = require('rift')('api'); 
    api.ping()
    .then(function(response) {
        ...
    })
    api.pong({name: 'Tester'})
    .then(function(response) {
        ...
    })

## Middleware Configuration

You may want to provide additional processing beyond the built-in JSON parsing/stringifying.
For example, to implement caching:

    api.config.set('before', function(request, defer) {
        return new Promise(function(resolve, reject) {
            // try to find the URL in cache
            asyncCache.get(request.url, function(err, response) {
                if (response) {
                    // found: bypass XHR and return immediately to caller
                    defer.resolve(response);
                }
                // always resolve the promise you return
                resolve();
            })
        })
    })

Or add some extra params (eg if you're calling an API with header-based auth):

    api.config.set('before', function(request, defer) {
        request.params.myAuthToken = 'TOKEN_VALUE';
    })

The first `request` param to 'before' and 'after' is a lightweight request wrapper. 
It can be modified at any time, though only 'before' middleware can have an effect
on the XHR request itself.
    
    request = {
        headers: {},            // object literal
        options: {},            // object literal
        params: {},             // object literal of params
        host: '',               // string hostname
        url: '/pong/Tester',    // the endpoint URL with tokens replaced from params
        method: 'get'           // lowercase HTTP method (eg get, post, put, delete)
    }

The `defer` param is a deferred Promise object created via `Promise.defer()`. You can
call `defer.resolve(...)` to abort further processing and return a value immediately.
Alternatively, call `defer.reject(new Error('...'))` to abort processing and return
a rejected value immediately.


## Server Configuration (Optional)

You may optionally host the implementations of your API endpoints on a node server.

    var rift = require('rift');
    var api = rift('api');
    api.config.define({
        // as above
        ping: {},
        pong: {}
    });
    // on server, delegate to real implementations:
    api.config.delegate({
        ping: function() {
            return Promise.cast('hello');
        },
        pong: function(params) {
            return Promise.cast('hello ' + params.name)
        }
    })
    // and serve it via express:
    var app = express();
    app.use(app.router);
    api.config.middleware(app);
    app.listen();
