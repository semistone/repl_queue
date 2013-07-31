var rely_rest = require('../../lib/readers/rely_rest.js');
var dist = require('../../lib/readers/dist.js');
var ip_acl = require('../../lib/ip_acl.js');
var filter_module = require('../../lib/filter.js');
var rely_socketio = require('../../lib/readers/rely_socketio.js');
var ExampleReader = function (){
    this.consumer_function = function (row, callback) {
        callback(true, row);
    }
};
config = {
    type: 'fifo',
    path: '../test/example',
    max_volumes: 5,
    is_binary: false,
    server: {
        listen: 9090,
        socketio_handler_enable: true,
        rest_handler_enable: true 
    },
    reader:{
        '1':{ // index
            consumer_function: [rely_rest, 'http://localhost:9091/repl/example'],
            filter : filter_module.filter('ID', filter_module.mod_rule(2 ,0))
        },
        '2':{// index
            consumer_function: [rely_rest, 'http://localhost:9091/repl/example'],
            filter : filter_module.filter('ID', filter_module.mod_rule(2 ,1))
        },
        '3':{// index
            consumer_function: [ExampleReader, '']
        },
        '4':{
            consumer_function: [dist, '../test/test_dist'],
        }
    },
    writer: {
        acl: ip_acl('127.0.0.1')
    }
};
module.exports = config;
