var util = require('util');

// from @JayyVis at http://stackoverflow.com/a/8460508/73547

function RiftRequestError(message, request) {
  Error.call(this); //super constructor
  Error.captureStackTrace(this, this.constructor); //super helper method to include stack trace in error object

  this.name = this.constructor.name; //set our function’s name as error name.
  this.message = message; //set the error message
  this.request = request;
}

util.inherits(RiftRequestError, Error);

module.exports = RiftRequestError;