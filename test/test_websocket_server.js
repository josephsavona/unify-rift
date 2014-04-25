var io                = require('socket.io').listen(8100),
      endpoints  = require('./test.rift'),
      _                  = require('lodash'),
      socket;

module.exports = {
  start: function () {
    socket = io.sockets.on('connection', function (socket) {
      _.forIn(endpoints, function (endpoint, topic) {
        if (endpoint.client !== 'socket') { return; }
          socket.on(topic, function (data) {
            socket.emit('on' + topic.charAt(0).toUpperCase() + topic.slice(1), {
              meta: {},
              data: {
                message: topic + ' has been received.'
              },
              errors: []
            })
          });
      });
    });
  },
  stop: function () {
    //need to figure out how to close this stooopid socket!!!
  }
};