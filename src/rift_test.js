var Promise = require('bluebird'),
    _ = require('lodash');

var RiftTest = function(rift) {
  this._rift = rift;
  this._requestRecord = [],
  this._responseQueue = {};
  this._init();
};

RiftTest.prototype._init = function() {
  // dummy resolver will register any topic
  this._rift.registerResolver(function(topic) {
    return {
      topic: topic
    };
  });

  // dummy middleware to allow manipulation of a request
  this._rift.use(function(request) {
    var topic = request.endpoint.topic,
        responseDefer = Promise.defer(),
        requestDefer = Promise.defer(),
        queuedResponse;

    // if have a queued response, reply with it immediately
    if (topic in this._responseQueue) {
      queuedResponse = this._responseQueue[topic];
      delete this._responseQueue[topic];
      if (queuedResponse.resolve) {
        request.resolve(queuedResponse.resolve);
      } else {
        request.reject(queuedResponse.reject);
      }
      return;
    }

    // save a record of the call
    this._requestRecord.push({
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
  }.bind(this));
}

RiftTest.prototype._findRecordForTopic = function findRecordForTopic(topic) {
  var record;
  if (!topic) {
    return;
  }
  // find first instance of matching topic
  record = _.find(this._requestRecord, function(item) {
    return item.topic === topic;
  });
  return record;
};

RiftTest.prototype._clearRecord = function clearRecord(record) {
  this._requestRecord = _.filter(this._requestRecord, function(item) {
    return item !== record;
  })
};

RiftTest.prototype.clearAll = function clearAll() {
  this._requestRecord = [];
};

/**
 * resolve(topic, value)
 * @param  {String} topic: resolve the next request on this topic
 * @param  {*} value: resolve the request with this value
 * @return {n/a}
 *
 * configure rift to answer the next request to topic with value.
 * if there is/are pending requests, resolves the first one.
 */
RiftTest.prototype.resolve = function resolve(topic, value) {
  var record = this._findRecordForTopic(topic);
  if (record) {
    record.defer.resolve(value);
    this._clearRecord(record);
  } else {
    this._responseQueue[topic] = {
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
 RiftTest.prototype.reject = function rejct(topic, err) {
  var record = this._findRecordForTopic(topic);
  if (record) {
    record.defer.reject(err);
    this._clearRecord(record);
  } else {
    this._responseQueue[topic] = {
      reject: err
    };
  }
},

/**
 * hasRequestForTopic(topic)
 * @param  {String}  topic: a topic name
 * @return {Boolean} true iff an outstanding request exists for topic
 */
RiftTest.prototype.hasRequestForTopic = function hasRequestForTopic(topic) {
  return !!this._findRecordForTopic(topic);
},

/**
 * hasRequests()
 * @return {Boolean} true iff there are any outstanding requests
 */
RiftTest.prototype.hasRequests = function hasRequests() {
  return !!this._requestRecord.length;
},

/**
 * hasQueuedResponses()
 * @return {Boolean} true iff there are queued response that have not yet matched a request
 */
RiftTest.prototype.hasQueuedResponses = function hasQueuedResponses() {
  return _.isEmpty(this._responseQueue);
}

module.exports = RiftTest;