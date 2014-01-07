var rift = require('../index');
var api = require('./test.rift.js');

rift.generateApi(api, function(err, text) {
  if (err) {
    return console.error(err);
  }
  console.log('API:');
  console.log(text);
});

rift.generateClient(api, function(err, text) {
  if (err) {
    return console.error(err);
  }
  console.log('CLIENT:');
  console.log(text);
});


