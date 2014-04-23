var Promise = require('bluebird');
var http = require('superagent');
var qs = require('qs');
var _ = require('lodash');
var util = require('util');
var RiftError = require('./rift_error');

module.exports = function xhrBefore(request, defer) {
  var xhr;
  if (!request || !request.endpoint || request.endpoint.client !== 'http') {
    return;
  }
  if (request.error || request.data) {
    return;
  }
  return new Promise(function(resolve) {
    var url = request.endpoint.url;
    var method = (request.endpoint.method || '').toLowerCase().trim();
    var host = 'host' in request.options && request.options.host ? request.options.host : '';
    if (typeof http[method] !== 'function') {
      throw new RiftError(util.format('Invalid HTTP Method %s', method));
    }
    if (!url) {
      throw new RiftError('No URL Provided');
    }
    console.log(util.format('http: url=%s method=%s', host + url, method));
    xhr = http[method](host + url);
    if ('httpHeaders' in request.options) {
      xhr.set(request.options.httpHeaders);
    }
    if ('csrf' in request.options) {
      xhr.set('X-CSRF-Token', request.options.csrf);
    }

    if (method === 'post' || method === 'put') {
      xhr.send(request.params);
    } else {
      xhr.query(qs.stringify(request.params));
    }
    xhr.end(function(err, response) {
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
        request.data = response.body;
      }
      resolve();
    });
  })
}