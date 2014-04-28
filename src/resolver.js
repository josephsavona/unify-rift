/*
 *  riftResolver(topic)
 *  @param {String} topic: a topic name
 *  @returns {Object} an object describing an endpoints metadata
 */
module.exports = function riftResolver(topic, definitions) {
  if (topic in definitions && definitions[topic]) {
    return definitions[topic];
  }
  throw new RiftError('topic not defined: ' + topic);
}