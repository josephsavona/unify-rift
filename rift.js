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
   *  the `config` property is a getter to configAccessor(),
   *  see below for available configuration methods
   */
  var api = {
    request: function(topic, data, options) {
      if (typeof config.resolver !== 'function') {
        return Promise.reject(new RiftError('No resolver specified'));
      }
      return new Promise(function(resolve) {
        var endpoint, client, callbacks;
        endpoint = config.resolver(topic);
        if (!endpoint) {
          return reject(new RiftError('topic undefined: ' + topic));
        }
        client = config.clientFactory(endpoint);
        if (!client) {
          return reject(new RiftError('client undefined for topic: ' + topic));
        }
        callbacks = _.chain([config.before, client.before || client, config.after, client.after]).flatten().filter(_.isFunction).value();
        return resolve(exec(callbacks, endpoint, data, options));
      });
    }
  };
  Object.defineProperties(api, {
    config: {
      get: function() {
        return configAccessor;
      }
    }
  });

  /*
   * private config values
   */
  var config = {
    'defaults': {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    before: [],
    after: [],
    definitions: {},
    clients: {},

    /*
     *  resolver(topic)
     *  @param {String} topic: a topic name
     *  @returns {Object} an object describing an endpoints metadata
     */
    resolver: function(topic) {
      if (topic in this.definitions && this.definitions[topic]) {
        return this.definitions[topic];
      }
      throw new RiftError('topic not defined: ' + topic);
    },

    /*
     *  clientFactory(endpoint)
     *  @param {Object} endpoint: object describing an endpoint
     *  @returns: a function that will call the endpoint
     */
    clientFactory: function(endpoint) {
      if (endpoint && typeof endpoint.delegate === 'function') {
        return endpoint.delegate;
      }
      if (endpoint && endpoint.client && endpoint.client in this.clients) {
        return this.clients[endpoint.client];
      }
      throw new RiftError('client not defined: ' + endpoint.client + ' for topic: ' + endpoint.topic);
    }
  };

  /*
   *  public API for modifying the private config,
   *  available via `apiInstance.config.METHOD()`
   */
  var configAccessor = {

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
     *  registerClient(type, client)
     *  @param {String}
     */
    registerClient: function(type, client) {
      if (!type || !client) {
        throw new RiftError('registerClient: must set type and client');
      }
      config.clients[type] = client;
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
     *  api.request('ping')
     *  .then(function(response) {
     *    // response is the JSON response from the server
     *  })
     *  .catch(function(err) {
     *    // err is the server error or error from parsing response
     *  })
     *  ```
     */
    define: function(definition) {
      config.definitions = setDefinition(config.definitions, definition);
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
      config.definitions = setDelegate(config.definitions, delegate);
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
      createRoutes(config.definitions, app);
    }
  };
  Object.freeze(configAccessor);

  /*
   *  createRoutes(endpoints, app)
   *  @private
   *  @param endpoints: object literal of endpoints
   *  @param app: express application on which to create endpoints
   *  See `configAccessor.middleware()`
   */
  var createRoutes = function(endpoints, app) {
    _.forIn(endpoints, function(endpoint, topic) {
      app[endpoint.method].call(app, (config['base'] || '') + endpoint.url, (function(endpoint) {
        return createRoute(endpoint);
      })(endpoint));
    });
  };

  /*
   *  createRoute(endpoint)
   *  Creates a route for the given endpoint for serving it on teh server.
   */
  var createRoute = function(endpoint) {
    return function(req, res, next) {
      var params = _.extend({}, req.query, req.body, req.params);
      return new Promise(function(resolve) {
        resolve(exec([endpoint.delegate], endpoint, params, req));
      })
      .then(function(response) {
        if (!req.xhr) {
          return res.redirect(endpoint.redirectUrl || '/');
        }
        return res.json(response);
      })
      .catch(function(err) {
        next(err);
      });
    };
  };

  /*
   *  setDefinition(target, definitions)
   */
  var setDefinition = function(target, definitions) {
    target = _.merge(target, definitions);
    _.forIn(target, function(endpoint, topic) {
      endpoint.topic = topic;
    });
    return target;
  };

  /*
   *  setDelegate(target, delagators)
   */
  var setDelegate = function(target, delagators) {
    _.forIn(target, function(endpoint, topic) {
      if (!(topic in delagators)) {
        return;
      }
      endpoint.delegate = delagators[topic];
    });
    return target;
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
   *  exec(callbacks, endpoint, params, options)
   *  Given and endpoint definition, params, and other options,
   *  makes an XHR request to the `endpoint`, passing the request
   *  through config before/after middleware. 
   *
   *  Returns a promise that resolves/rejects with the XHR.
   */
  var exec = function(callbacks, endpoint, params, options) {
    var defer, request;
    // promise to return
    defer = Promise.defer();
    // request wrapper to pass to before/after middleware
    request = {
      headers: _.defaults({}, config.defaults),
      options: options || {},
      params: params,
      host: config.host || '',
      method: endpoint.method || '',
      url: '', // set below
      endpoint: endpoint,
      config: config
    }
    if (endpoint.url) {
      request.url = urlify((config['base'] || '') + endpoint.url, params);
    }
    execChain(callbacks, request, defer);
    return defer.promise;
  }


  /*
   *  execChain(client, request, defer)
   *  internal implementation of `exec` that iterates
   *  through the middleware chain asynchronously.
   */
  var execChain = function(callbacks, request, defer) {
    var ix, next;
    ix = 0;
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

  return api;
};
