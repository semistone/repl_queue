var rely = require('../readers/rely.js');
var dist = require('../readers/dist.js');
var ip_acl = require('../ip_acl.js');
var rely_socketio = require('../readers/rely_socketio.js');
config = {
    type: 'fifo',
    path: './example',
    reader:{
        /*'1':{ // index
            consumer_function: dist('./example/volume2.db')
        },
        '2':{// index
            consumer_function: rely('http://localhost:9090')
        },*/
        '3':{// index
            consumer_function: rely_socketio('http://localhost:9090')
        },
    },
    writer: {
        acl: ip_acl('127.0.0.1'),
        listen: 9090,
        socketio_handler_enable: true,
        rest_handler_enable: false 
    }
};
module.exports = config;
