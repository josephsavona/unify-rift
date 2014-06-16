var Promise = require('bluebird'),
    assert = require('chai').assert,
    _ = require('lodash'),
    Rift = require('rift'),
    rift = Rift(),
    requestRecord = [],
    responseQueue = {};

function findRecordForTopic(topic) {
  var record;
  if (!topic) {
    return;
  }
  // find first instance of matching topic
  record = _.find(requestRecord, function(item) {
    return item.topic === topic;
  });
  return record;
};

function clearRecord(record) {
  requestRecord = _.filter(requestRecord, function(item) {
    return item !== record;
  })
};

function clearAll() {
  requestRecord = [];
};

// dummy resolver will register any topic
rift.registerResolver(function(topic) {
  return {
    topic: topic
  };
});

// dummy middleware to allow manipulation of a request
rift.use(function(request) {
  var topic = request.endpoint.topic,
      responseDefer = Promise.defer(),
      requestDefer = Promise.defer(),
      queuedResponse;

  // if have a queued response, reply with it immediately
  if (topic in responseQueue) {
    queuedResponse = responseQueue[topic];
    delete responseQueue[topic];
    if (queuedResponse.resolve) {
      request.resolve(queuedResponse.resolve);
    } else {
      request.reject(queuedResponse.reject);
    }
    return;
  }

  // save a record of the call
  requestRecord.push({
    topic: request.endpoint.topic,
    request: request,
    defer: responseDefer
  });

  // let test control when a response/rejection occurs
  // and provide the value.
  responseDefer.promise.then(function(value) {
    request.resolve(value);
    requestDefer.resolve();
  }).catch(function(err) {
    request.reject(err);
    requestDefer.resolve();
  });

  // do not complete the middleware until
  // the test has called respondeDefer.{resolve,reject}()
  return requestDefer.promise;
});

module.exports = {
  /**
   * clearAll()
   * @type {n/a}
   */
  clearAll: clearAll,

  /**
   * resolve(topic, value)
   * @param  {String} topic: resolve the next request on this topic
   * @param  {*} value: resolve the request with this value
   * @return {n/a}
   *
   * configure rift to answer the next request to topic with value.
   * if there is/are pending requests, resolves the first one.
   */
  resolve: function(topic, value) {
    var record = findRecordForTopic(topic);
    if (record) {
      record.defer.resolve(value);
      clearRecord(record);
    } else {
      responseQueue[topic] = {
        resolve: value
      };
    }
  },

  /**
   * reject(topic, err)
   * @param  {String} topic: reject the next request on this topic
   * @param  {Error} err: an error with which to reject
   * @return {n/a}
   *
   * configure rift to reject the next request to topic with err.
   * if there is/are pending requests, rejects the first one.
   */
  reject: function(topic, err) {
    var record = findRecordForTopic(topic);
    if (record) {
      record.defer.reject(err);
      clearRecord(record);
    } else {
      responseQueue[topic] = {
        reject: err
      };
    }
  },

  /**
   * hasRequestForTopic(topic)
   * @param  {String}  topic: a topic name
   * @return {Boolean} true iff an outstanding request exists for topic
   */
  hasRequestForTopic: function(topic) {
    return !!findRecordForTopic(topic);
  },

  /**
   * hasRequests()
   * @return {Boolean} true iff there are any outstanding requests
   */
  hasRequests: function() {
    return !!requestRecord.length;
  },
  
  /**
   * hasQueuedResponses()
   * @return {Boolean} true iff there are queued response that have not yet matched a request
   */
  hasQueuedResponses: function() {
    return _.isEmpty(responseQueue);
  }
};
