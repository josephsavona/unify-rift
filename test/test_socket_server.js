var EngineIO = require('engine.io'),
  endpoints = require('./test.rift'),
  _ = require('lodash'),
  io = null;

module.exports = {
  address: 8001,
  start: function () {
    io = EngineIO.listen(this.address);
    io.on('connection', function(socket) {
      socket.on('message', function(data) {
        var msg, response;
        msg = JSON.parse(data);
        response = {
          name: 'on' + msg.name,
          data: msg.data || null
        }
        socket.send(JSON.stringify(response));
      });
    });
  },
  close: function () {
    io.close();
    io.httpServer.close();
  }
};