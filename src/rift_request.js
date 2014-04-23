/*
 *  RiftResponse(endpoint, params[, options])
 *  @param {Object} endpoint: plain object describing an endpoint, eg url/method
 *  @param {Object} params: plain object with parameters to pass to the transport
 *  @param {Object} options: optional additional context that is passed to local interceptors but not to the transport
 */
module.exports = function RiftResponse(endpoint, params, options) {
  this.endpoint = endpoint || {};
  this.params = params || {};
  this.options = options || {};
  this.error = null;
  this.data = null;
  this.meta = {};
};
