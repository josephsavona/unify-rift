var Promise = require('bluebird');
var _ = require('lodash');
var util = require('util');
var RiftError = require('./rift_error');
var RiftRequest = require('./rift_request');
var RiftRequestError = require('./rift_request_error');

module.exports = function() {

  /*
   * private config values
   */
  var config = {
    custom: {
      'httpHeaders': {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    },
    callbacks: [],
    resolvers: [],
    definitions: {}
  };

  /*
   *  public API wrapper object, to which defined
   *  api endpoints are added as functions.
   *
   *  the `config` property is a getter to configAccessor(),
   *  see below for available configuration methods
   */
  var api = {
    /*
     *  resolve(topic)
     *  @param {String} topic: string name of a topic
     *  @returns {Object} the endpoint metadata if defined
     */
    resolve: function(topic) {
      var endpoint, ix;
      for (ix = 0; ix < config.resolvers.length; ix++) {
        endpoint = config.resolvers[ix](topic, config.definitions);
        if (endpoint) {
          return endpoint;
        }
      }
      return endpoint;
    },

    /*
     *  request(topic, params[, options])
     *  @param {String} topic: string name of topic
     *  @param {Object|Array} params: params to pass to the endpoint
     *  @param {Object} options: options/configuration used in request handling but not sent to endpoint
     *
     *  Make a request and return a Promise (bluebird) that will resolve/reject when
     *  a response is received. The request will be processed using all defined interceptors.
     */
    request: function(topic, params, options) {
      if (!config.resolvers.length) {
        return Promise.reject(new RiftError('no resolvers defined, cannot retrieve endpoint for topic'));
      }
      return new Promise(function(resolve) {
        var endpoint, callbacks;
        endpoint = this.resolve(topic);
        if (!endpoint) {
          return reject(new RiftError(util.format('topic undefined: %s checking %d resolvers', topic, config.resolvers.length)));
        }
        return resolve(exec(endpoint, params, options || {}));
      }.bind(this));
    },

    /*
     *  set(key, value)
     *  @param key: string key name
     *  @param value: value of the key
     *  
     *  Sets an option that will be passed to all requests in the `options` parameter.
     */
    set: function(key, value) {
      config.custom[key] = value;
      return this;
    },

    /*
     *  get(key)
     *  @param key: String key name
     *  @returns: the value of the config variable
     *
     *  Gets the named option previously defined via `.set()`
     */
    get: function(key) {
      return config.custom[key];
    },

    /*
     *  use(interceptor)
     *  @param {RiftInterceptor} interceptor: a function to intercept
     *  
     *  Adds the `interceptor` to the chain of middleware to be applied before/after a request.
     *  Example:
     *  ```
     *  rift.use(function(request, defer) {});
     *  ```
     */
    use: function(interceptor) {
      if (typeof interceptor !== 'function') {
        throw new RiftError('use: must provide a function');
      }
      config.callbacks.push(interceptor);
      return this;
    },

    /*
     *  registerResolver(resolver)
     *  @param {Function} resolver: function(topic){} that converts topic to an endpoint
     *
     *  Allows the application to define arbitrarily simple/complex methods of resolving
     *  topic names into endpoint definitions.
     */
    registerResolver: function(resolver) {
      if (typeof resolver !== 'function') {
        throw new RiftError('registerResolver: must specify a function');
      }
      config.resolvers.push(resolver);
      return this;
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
      config.definitions = setDefinition(config.definitions, definition || {});
      return this;
    }
  };
  Object.freeze(api);

  /*
   *  setDefinition(target, definitions)
   *  merges new definitions with existing ones in target
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
   *  merges new delegation methods with existing ones in target.
   *  note: ignores topics for which no definition exists.
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
   *  exec(endpoint, params, options)
   *  Given an endpoint definition, params, and other options,
   *  makes an XHR request to the `endpoint`, passing the request
   *  through config before/after middleware. 
   *
   *  Returns a promise that resolves/rejects as endpoints returns/errors.
   */
  var exec = function(endpoint, params, options) {
    var defer, riftRequest;
    // promise to return
    defer = Promise.defer();
    // request wrapper to pass to before/after middleware
    riftRequest = new RiftRequest(_.cloneDeep(endpoint), params, _.defaults(options, config.custom));
    if (endpoint.url) {
      riftRequest.endpoint.url = urlify(endpoint.url, params);
    }
    execChain(riftRequest, defer);
    return defer.promise;
  };

  /*
   *  execChain(riftRequest, defer)
   *  internal implementation of `exec` that iterates
   *  through the middleware chain asynchronously.
   */
  var execChain = function(riftRequest, defer) {
    var ix, next;
    ix = 0;
    next = function() {
      var fn, cast;
      fn = config.callbacks[ix++];
      if (!fn) {
        if (!defer.promise.inspect().isResolved()) {
          if (riftRequest.isRejected()) {
            // annotate the error with the rift request object
            riftRequest.error.riftRequest = riftRequest;
            defer.reject(riftRequest.error);
          } else if (riftRequest.isResolved()) {
            defer.resolve(riftRequest.data);
          } else {
            defer.reject(new RiftError('unresolved request: no interceptor provided a value.'));
          }
        }
        return;
      }
      // call each middleware in turn, exiting
      // out of loop if defer is resolved
      new Promise(function(resolve) {
        resolve(fn(riftRequest));
      }).catch(function(err) {
        riftRequest.reject(err);
      }).finally(function() {
        next();
      });
    };
    next();
  };

  return api;
};
