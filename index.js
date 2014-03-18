var Promise = require('bluebird');
var http = require('superagent');
var qs = require('qs');

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
  delegate: function(definition) {
    setDelegate(api, definition);
  }
};
Object.freeze(setConfig);

/*
 *  setDelegate(endpoints, definition)
 */
var setDelegate = function(endpoints, definition) {
  var endpoint;
  for (var key in definition) {
    if (!definition.hasOwnProperty(key) || key === 'delegate' || key === 'config') { continue; }
    endpoint = definition[key];
    if (typeof definition[key] === 'function') {
      endpoints[key] = definition[key];
    } else if (!definition[key].method) {
      endpoints[key] = endpoints[key] || {};
      setDelegate(endpoints[key], definition[key]);
    } else {
      endpoints[key] = (function(definition) {
        definition.method = definition.method.toLowerCase();
        return exec.bind(api, definition);
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
    if (!(param in params)) {
      if (optional) {
        return slash;
      }
      valid = false;
      return slash + param;
    }
    return slash + encodeURIComponent(params[param]);
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
    if (ctx && ctx.csrf) {
      xhr.set('X-CSRF-Token', ctx.csrf);
    }
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
      return resolve(response.body);
    });
  });
};
