var Promise = require('bluebird');
var http = require('superagent');
var qs = require('qs');
var _ = require('lodash');
var RiftError = require('./rift_error');

module.exports = function() {
  /*
   *  public API wrapper object, to which defined
   *  api endpoints are added as functions.
   *
   *  the `config` property is a getter to setConfig(),
   *  see below for available configuration methods
   */
  var api = Object.create({}, {
    config: {
      get: function() {
        return setConfig;
      },
      enumerable: false,
      configurable: false
    }
  });

  /*
   * private local config values
   */
  var config = {
    'defaults': {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    before: [],
    after: []
  };
  /*
   *  private callbacks list
   */
  var callbacks = [];

  /*
   *  public API for modifying the private config,
   *  available via `apiInstance.config.METHOD()`
   */
  var setConfig = {

    /*
     *  set(key, value)
     *  @param key: string key name
     *  @param value: value of the key
     *  
     *  Sets the configuration value for `key` to `value`.
     *  Special keys:
     *    defaults: object literal of headers to send by default
     *    before: an array of functions to run before the xhr request
     *    after: an array of functions to run after the xhr request
     *    
     */
    set: function(key, value) {
      // ensure that 'before' and 'after' are arrays of functions
      if (key === 'before' || key === 'after') {
        value = _.chain([value]).flatten().filter(_.isFunction).value();
        config[key] = value;
        callbacks = _.flatten([config.before, startXhrMiddleware, config.after, finalizeXhrMiddlware]);
      }
      config[key] = value;
    },

    /*
     *  get(key)
     *  @param key: String key name
     *  @returns: the value of the config variable
     */
    get: function(key) {
      return config[key];
    },

    /*
     *  define(definition)
     *  @param definition: object literal of api descriptions
     *  @returns undefined
     *
     *  The main rift method: tells rift about the urls/methods of each
     *  of the API endpoints it will wrap.
     *  Merges `definition` with any existing definitions on the instance.
     *  
     *  Usage:
     *  ```
     *  api = rift('api');
     *  api.define({
     *    ping: { url: '/ping', method: 'get' }
     *  })
     *  api.ping()
     *  .then(function(response) {
     *    // response is the JSON response from the server
     *  })
     *  .catch(function(err) {
     *    // err is the server error or error from parsing response
     *  })
     *  ```
     */
    define: function(definition) {
      setDefinition(api, definition);
    },

    /*
     *  delegate(delegate)
     *  @param delegate: object literal of endpoint implementations
     *
     *  Only necessary if you are using the same API on client/server.
     *  This method replaces any defined API XHR functions with
     *  local implementations from `delegate`. See `middleware()` for
     *  more information and `test/router_spec.js` and 
     *  `test/server_spec.js` for example usage.
     */
    delegate: function(delegate) {
      setDelegate(api, delegate);
    },

    /*
     *  middleware(app)
     *  @param app: an express-compatible http application
     *  @returns undefined
     *  
     *  Creates routes on `app` to serve the defined routes on this rift instance.
     *  Usage:
     *    ```
     *    api = rift('api');
     *    api.define({...api descriptions...});
     *    api.delegate({...api implementation...})
     *
     *    var app = express();
     *    app.use(app.router);
     *    api.config.middleware(app);
     *    ```
     */
    middleware: function(app) {
      createRoutes(api, app);
    }
  };
  Object.freeze(setConfig);

  /*
   *  createRoutes(endpoints, app)
   *  @private
   *  @param endpoints: object literal of endpoints
   *  @param app: express application on which to create endpoints
   *  See `setConfig.middleware()`
   */
  var createRoutes = function(endpoints, app) {
    var endpoint;
    for (var key in endpoints) {
      if (!endpoints.hasOwnProperty(key)) { continue; }
      endpoint = endpoints[key];
      if (endpoint.config && endpoint.config.url && endpoint.config.method) {
        app[endpoint.config.method].call(app, (config['base'] || '') + endpoint.config.url, (function(endpoint) {
          return createRoute(endpoint);
        })(endpoint));
      } else {
        createRoutes(endpoint, app);
      }
    }
  };

  /*
   *  createRoute(endpoint)
   *  Creates a route for the given endpoint for serving it on teh server.
   */
  var createRoute = function(endpoint) {
    return function(req, res, next) {
      var params = _.extend({}, req.query, req.body, req.params);
      endpoint(params, req)
      .then(function(response) {
        if (!req.xhr) {
          return res.redirect(endpoint.redirectUrl || '/');
        }
        return res.json(response);
      }).catch(function(err) {
        next(err);
      });
    };
  };

  /*
   *  setDelegate()
   *  Replaces defined endpoints on `endpoints` with matching
   *  implementations in `delegate`
   */
  var setDelegate = function(endpoints, delegate) {
    var endpoint, config;
    for (var key in delegate) {
      if (!delegate.hasOwnProperty(key) || !endpoints.hasOwnProperty(key)) { continue; }
      endpoint = delegate[key];
      if (typeof endpoint === 'function') {
        endpoint.config = endpoints[key] ? endpoints[key].config : {};
        endpoints[key] = endpoint;
      } else {
        setDelegate(endpoints[key], endpoint);
      }
    }
  };

  /*
   *  setDefinition(endpoints, definition)
   *  Create promisified-xhr functions for each endpoint
   *  defined in `definition`.
   */
  var setDefinition = function(endpoints, definition) {
    var endpoint;
    for (var key in definition) {
      if (!definition.hasOwnProperty(key) || key === 'config') { continue; }
      endpoint = definition[key];

      if (!endpoint.url) {
        endpoints[key] = {};
        setDefinition(endpoints[key], endpoint);
      } else {
        endpoints[key] = (function(definition) {
          var delegate = exec.bind(api, definition);
          delegate.config = definition;
          delegate.config.method = (delegate.config.method || 'get').toLowerCase().trim();
          return delegate;
        })(definition[key]);
      }
    }
  };

  /*
   *  urlify(url, params)
   *    @param url: string url optionally containing regex matchers
   *    @param params: object literal representing params
   *    @returns string url with matchers replaced by value of params
   *
   *    example: 
   *    /user/:userId/post/:postId {userId:1, postId: 2}
   *    => /user/1/post/2
   */
  var urlify = function(url, params) {
    var valid = true;
    var urlified = url.replace(/:(\/?)(\w+)(\??)/g, function(_, slash, param, optional) {
      var value;
      if (!(param in params)) {
        if (optional) {
          return slash;
        }
        valid = false;
        return slash + param;
      }
      value = params[param];
      delete params[param];
      return slash + encodeURIComponent(value);
    });
    return valid ? urlified : null;
  };

  /*
   *  exec(endpoint, params, options)
   *  Given and endpoint definition, params, and other options,
   *  makes an XHR request to the `endpoint`, passing the request
   *  through config before/after middleware. 
   *
   *  Returns a promise that resolves/rejects with the XHR.
   */
  var exec = function(endpoint, params, options) {
    var defer, request;
    // promise to return
    defer = Promise.defer();
    // request wrapper to pass to before/after middleware
    request = {
      headers: config.defaults || {},
      options: options || {},
      params: params,
      host: config.host || '',
      url: urlify((config['base'] || '') + endpoint.url, params),
      method: endpoint.method
    }
    execChain(request, defer);
    return defer.promise;
  }


  /*
   *  execChain(request, defer)
   *  internal implementation of `exec` that iterates
   *  through the middleware chain asynchronously.
   */
  var execChain = function(request, defer) {
    var ix, next;
    ix = 0;
    if (!callbacks.length) {
      callbacks = [startXhrMiddleware, finalizeXhrMiddlware];
    }
    next = function() {
      var fn, cast;
      fn = callbacks[ix++];
      if (!fn) {
        return;
      }
      // call each middleware in turn, exiting
      // out of loop if defer is resolved
      new Promise(function(resolve) {
        resolve(fn(request, defer));
      })
      .catch(function(err) {
        defer.reject(err);
      })
      .finally(function() {
        if (!defer.promise.inspect().isResolved()) {
          next();
        }
      });
    }
    next();
  }

  // makes the XHR request for the given `request` object
  var startXhrMiddleware = function(request, defer) {
    var xhr;
    return new Promise(function(resolve) {
      console.log('startXhrMiddleware');
      request.method = (request.method || '').toLowerCase().trim();
      if (typeof http[request.method] !== 'function') {
        throw new RiftError('Invalid HTTP Method ' + request.method);
      }
      if (!request.url) {
        throw new RiftError('No URL Provided');
      }
      xhr = http[request.method](request.host + request.url);
      xhr.set(request.headers);
      if (config['csrf']) {
        xhr.set('X-CSRF-Token', config['csrf']);
      }

      if (request.method === 'post' || request.method === 'put') {
        xhr.send(request.params);
      } else {
        xhr.query(qs.stringify(request.params));
      }
      xhr.end(function(err, response) {
        console.log('startXhrMiddleware: response');
        request.response = response;
        request.error = null;
        request.body = null;

        if (err) {
          request.error = err;
        } else if (!response.ok || response.error) {
          // save some useful information directly on the RiftError
          request.error = new RiftError('Not ok/error', {
            error: response.error || {},
            clientError: response.clientError,
            serverError: response.serverError,
            accepted: response.accepted,
            noContent: response.noContent,
            unauthorized: response.unauthorized,
            notAcceptable: response.notAcceptable,
            forbidden: response.forbidden,
            notFound: response.notFound,
            status: response.status,
            statusCode: response.statusCode,
            domain: response.req.domain,
            method: response.req.method,
            path: response.req.path,
            text: response.text
          });
        } else {
          request.body = response.body;
        }
        resolve();
      });
    })
  }

  // resolves the `defer`-ed object with the request error/body
  var finalizeXhrMiddlware = function(request, defer) {
    console.log('finalizeXhrMiddlware');
    if (request.error) {
      defer.reject(request.error);
    } else {
      defer.resolve(request.body);
    }
  }

  return api;
};
