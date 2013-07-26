var rely_rest = require('../../lib/readers/rely_rest.js');
var dist = require('../../lib/readers/dist.js');
var ip_acl = require('../../lib/ip_acl.js');
var filter_module = require('../../lib/filter.js');
var rely_socketio = require('../../lib/readers/rely_socketio.js');
config = {
    type: 'fifo',
    path: '../test/example',
    server: {
        listen: 9090,
        socketio_handler_enable: true,
        rest_handler_enable: true 
    },
    reader:{
        '1':{ // index
            consumer_function: [rely_rest, 'http://localhost:9090/repl/example'],
            filter : filter_module.filter('ID', filter_module.mod_rule(2 ,0))
        },
        '2':{// index
            consumer_function: [rely_rest, 'http://localhost:9090/repl/example'],
            filter : filter_module.filter('ID', filter_module.mod_rule(2 ,1))
        },/*
        '3':{// index
            consumer_function: rely_socketio('http://localhost:9090/repl_socket/example')
        },*/
    },
    writer: {
        acl: ip_acl('127.0.0.1')
    }
};
module.exports = config;
