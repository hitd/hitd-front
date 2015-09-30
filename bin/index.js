var myModule = require('..');
var myPackage = require('../package.json');

var debug = require('hitd-debug')(myPackage.name);

debug('will start');

var registerEndPoint = 'tcp://127.0.0.1:12345';
if (process.env.ROUTER_ENV_INPORT_CLIENT_ADDR && process.env.ROUTER_ENV_INPORT_CLIENT_PROTO &&
  process.env.ROUTER_ENV_INPORT_CLIENT_PORT) {
  registerEndPoint = process.env.ROUTER_ENV_INPORT_CLIENT_PROTO + '://' +
    process.env.ROUTER_ENV_INPORT_CLIENT_ADDR + ':' + process.env.ROUTER_ENV_INPORT_CLIENT_PORT;
}

myModule(registerEndPoint, {
  heartbeat: 30
}, function() {
  debug('did start');
});
