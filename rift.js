var Promise = require('bluebird');
var http = require('superagent');
var qs = require('qs');
var _ = require('lodash');
var RiftError = require('./rift_error');
var ValidationError = require('./validation_error');

module.exports = function() {
  // core definition.
  // protect the 'config' property via a getter method
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
   *  accessor for config values
   */
  var config = {
    'defaults': {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    before: [],
    after: []
  };
  var setConfig = {
    set: function(key, value) {
      // ensure that 'before' and 'after' are arrays of functions
      if (key === 'before' || key === 'after') {
        value = _.chain([value]).flatten().filter(_.isFunction).value();
      }
      config[key] = value;
    },
    get: function(key) {
      return config[key];
    },
    define: function(definition) {
      setDefinition(api, definition);
    },
    delegate: function(delegate) {
      setDelegate(api, delegate);
    },
    middleware: function(app) {
      createRoutes(api, app);
    }
  };
  Object.freeze(setConfig);

  /*
   *  createRoutes(endpoints, app)
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
          if (delegate.config.before) {
            delegate.config.before = _.isArray(delegate.config.before) ? delegate.config.before : [delegate.config.before];
          } else {
            delegate.config.before = [];
          }
          if (delegate.config.after) {
            delegate.config.after = _.isArray(delegate.config.after) ? delegate.config.after : [delegate.config.after];
          } else {
            delegate.config.after = [];
          }
          if (delegate.config.catch) {
            delegate.config.catch = _.isArray(delegate.config.catch) ? delegate.config.catch : [delegate.config.catch];
          } else {
            delegate.config.catch = [];
          }
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
   *  exec(endpoint, params, ctx)
   *    @returns: Promise that will resolve/reject based on xhr status 
   */
  var exec = function(endpoint, params, ctx) {
    return new Promise(function(resolve, reject) {
      var rejectValue, resolveValue, ix;
      ctx = _.extend(ctx || {}, {
        reject: function(value) {
          rejectValue = value;
        },
        resolve: function(value) {
          resolveValue = value;
        },
        headers: config.defaults || {},
        ctx: ctx || {},
        params: params,
        host: config.host || '',
        url: urlify((config['base'] || '') + endpoint.url, params),
        method: endpoint.method
      });

      // optional 'before' filters
      for (ix = 0; ix < config.before.length; ix++) {
        config.before[ix](ctx);
        if (typeof rejectValue !== 'undefined') {
          return reject(rejectValue);
        }
        if (typeof resolveValue !== 'undefined') {
          return resolve(resolveValue);
        }
      }

      if (!ctx.url || !ctx.method) {
        return reject(new RiftError('No url/method'));
      }

      xhr = http[ctx.method](ctx.host + ctx.url);
      xhr.set(ctx.headers);
      if (config['csrf']) {
        xhr.set('X-CSRF-Token', config['csrf']);
      }

      if (ctx.method === 'post' || ctx.method === 'put') {
        xhr.send(ctx.params);
      } else {
        xhr.query(qs.stringify(ctx.params));
      }
      xhr.end(function(err, response) {
        var ix;

        if (err) {
          ctx.error = err;
        } else if (!response.ok || response.error) {
          ctx.error = new RiftError('not ok/has error', {
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
          ctx.body = response.body;
        }

        // optional 'after' filters
        for (ix = 0; ix < config.after.length; ix++) {
          config.after[ix](ctx);
          if (typeof rejectValue !== 'undefined') {
            return reject(rejectValue);
          }
          if (typeof resolveValue !== 'undefined') {
            return resolve(resolveValue);
          }
        }
        if (ctx.error) {
          return reject(ctx.error);
        }
        resolve(ctx.body);
      });
    });
  };

  return api;
};
