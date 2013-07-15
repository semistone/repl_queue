var rely = require('../readers/rely.js');
var dist = require('../readers/dist.js');
var ip_acl = require('../ip_acl.js');
var rely_socketio = require('../readers/rely_socketio.js');
var config = {
    localhost:{
        server: {
            listen: 9090,
            base_dir = './'
        },
        queues:{
            example1:{
                type: 'fifo',
                reader:{
                    '1':{ // index
                        consumer_function: dist('@localhost:queue2')
                    },
                    '2':{// index
                        consumer_function: rely_rest('@localhost:queue2')
                    },
                    '3':{// index
                        consumer_function: rely_socketio('@localhost:queue2')
                    },
                    '4':{
                        consumer_function: subscribe_from('@localhost:queue2')
                    }
                },
                subscribe_enable: true
            },
            example2:{
                writer: {
                    acl: ip_acl('127.0.0.1'),
                    socketio_handler_enable: true,
                    rest_handler_enable: true,
                    subscribe_to: '@localhost:queue1.4' // from host:localhost queue:queue1 id:4
                }
            }
        }
    }
};
module.exports = config;
