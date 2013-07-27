var rely_rest = require('../../lib/readers/rely_rest.js');
var dist = require('../../lib/readers/dist.js');
var ip_acl = require('../../lib/ip_acl.js');
var filter_module = require('../../lib/filter.js');
var rely_socketio = require('../../lib/readers/rely_socketio.js');
config = {
    type: 'fifo',
    path: '../test/example2',
    max_volumes: 5,
    server: {
        listen: 9091,
        socketio_handler_enable: true,
        rest_handler_enable: true 
    },
    writer: {
        acl: ip_acl('127.0.0.1')
    }
};
module.exports = config;
