var rely = require('../rely.js');
config = {
    type: 'fifo',
    path: './example',
    consumers: [
        {index: 1,       
         consume_msg_callback: function(row, callback){
             console.log('consume:' + row.ID + " data:" + row.DATA);
             callback(true);}
        },
        {index: 2,       
         consume_msg_callback: function(row, callback){
             console.log('consume:' + row.ID + " data:" + row.DATA);
             callback(true);}
        }
    ],
    writer: {
        listen: 9090
    },
    consume_msg_callback: rely('http://localhost:9090'),
    index: 1  
};
module.exports = config;
