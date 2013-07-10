var rely = require('../rely.js');
var dist = require('../dist.js');
var ip_acl = require('../ip_acl.js');
config = {
    type: 'fifo',
    path: './example',
    /*
    reader:{
        '1':{ // index
            consumer_function: dist('./example/volume2.db')
        },
        '2':{// index
            consumer_function: rely('http://localhost:9090')
        }
    },*/
    writer: {
        acl: ip_acl('127.0.0.1'),
        listen: 9090
    },
    //consumer_function: rely('http://localhost:9090'),
    consumer_function: dist('./example/volume2.db'),
    index: 1  
};
module.exports = config;
