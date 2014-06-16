var RiftError = require('./rift_error');

/*
 *  riftResolver(topic, definitions)
 *  @param {String} topic: a topic name
 *  @param {Object} definitions: a map of topic -> definitions (may be nested).
 *  @returns {Object} an object describing an endpoint
 */
module.exports = function riftResolver(topic, definitions) {
  var endpoint;

  if (topic.indexOf('.') === -1) {
    endpoint = definitions[topic];
  } else {
    topic.split('.').reduce(function(a,b) {
      if (typeof a === 'object') {
        return a[b];
      } else {
        return definitions[a][b];
      }
    });
  }
  if (endpoint) {
    return endpoint;
  }
  throw new RiftError('topic not defined: ' + topic);
};