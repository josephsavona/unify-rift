var Promise = require('bluebird');
var http = require('superagent');
var qs = require('qs');
var _ = require('lodash');

// core definition.
// protect the 'config' property via a getter method
var api = module.exports = Object.create({}, {
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
var config = {};
var setConfig = {
  set: function(key, value) {
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
      })(endpoint);
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
    var url = urlify((config['base'] || '') + endpoint.url, params);
    if (url === null) {
      return reject(new Error('Invalid url/parameters'));
    }
    var method = endpoint.method;
    var xhr = http[method](url);
    xhr.set({
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    });
    if (ctx && ctx['csrf']) {
      xhr.set('X-CSRF-Token', ctx['csrf']);
    } else if (config['csrf']) {
      xhr.set('X-CSRF-Token', config['csrf']);
    }

    // todo: 'before' interceptors
    // todo: validation with unify-data

    if (method === 'post' || method === 'put') {
      xhr.send(params);
    } else {
      xhr.query(qs.stringify(params));
    }
    xhr.end(function(err, response) {
      if (err) {
        return reject(err);
      }
      if (!response.ok || response.error) {
        return reject({
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
      }

      // todo: parse response model with unify-data
      // todo: 'after' interceptors

      return resolve(response.body);
    });
  });
};
