var Promise = require('bluebird');
var http = require('superagent');
var qs = require('qs');
var _ = require('lodash');
var RiftError = require('./rift_error');

module.exports = {
  // makes the XHR request for the given `request` object
  before: function xhrBefore(request, defer) {
    var xhr;
    return new Promise(function(resolve) {
      request.method = (request.method || '').toLowerCase().trim();
      if (typeof http[request.method] !== 'function') {
        throw new RiftError('Invalid HTTP Method ' + request.method);
      }
      if (!request.url) {
        throw new RiftError('No URL Provided');
      }
      xhr = http[request.method](request.host + request.url);
      xhr.set(request.headers);

      if (request.method === 'post' || request.method === 'put') {
        xhr.send(request.params);
      } else {
        xhr.query(qs.stringify(request.params));
      }
      xhr.end(function(err, response) {
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
  },

  // resolves the `defer`-ed object with the request error/body
  after: function xhrAfter(request, defer) {
    if (request.error) {
      defer.reject(request.error);
    } else {
      defer.resolve(request.body);
    }
  }
}