var fs = require('fs');
var path = require('path');
var ejs = require('ejs');

var templates = {
  client: fs.readFileSync(path.resolve(__dirname, 'templates', 'client.js.ejs'), 'utf8'),
  api: fs.readFileSync(path.resolve(__dirname, 'templates', 'api.js.ejs'), 'utf8')
};

var generate = function(template, apiDefinition, cb) {
  process.nextTick(function() {
    var text;
    try {
      text = ejs.render(template, {endpoints: apiDefinition});
      cb(null, text);
    } catch (e) {
      cb(e, null);
    }
  });
};

module.exports = {
  generateClient: function(apiDefinition, cb) {
    generate(templates.client, apiDefinition, cb);
  },
  generateApi: function(apiDefinition, cb) {
    generate(templates.server, apiDefinition, cb);
  }
};

