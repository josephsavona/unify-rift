var _ = require('lodash');

/*
 *  RiftResponse(endpoint, params[, options])
 *  @param {Object} endpoint: plain object describing an endpoint, eg url/method
 *  @param {Object} params: plain object with parameters to pass to the transport
 *  @param {Object} options: optional additional context that is passed to local interceptors but not to the transport
 */
var RiftResponse = function RiftResponse(endpoint, params, options) {
  this.endpoint = endpoint;
  this.params = params;
  this.options = options;
  this.error = null;
  this.data = null;
  this.meta = null;
};

RiftResponse.prototype = {
  constructor: RiftResponse,

  toString: function() {
    return '[object RiftResponse]';
  },

  isRejected: function(klass) {
    if (!this.error) {
      return false;
    }
    if (!klass) {
      return true;
    }
    return (this.error instanceof klass);
  },

  reject: function(error) {
    this.error = error;
    this.data = null;
  },

  isResolved: function() {
    return typeof this.data !== 'undefined' && this.data !== null;
  },

  resolve: function(data) {
    this.data = data;
    this.error = null;
  },

  annotate: function(metadata) {
    this.meta = _.merge(this.meta, metadata);
  }
}

module.exports = RiftResponse;
