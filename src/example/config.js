var rely = require('../rely.js');
config = {
    type: 'fifo',
    path: './example',
    /*consumers: [
        {index: 1,       
         consumer_function: function(row, callback){
             console.log('consume:' + row.ID + " data:" + row.DATA);
             callback(true);}
        },
        {index: 2,       
         consumer_function: function(row, callback){
             console.log('consume:' + row.ID + " data:" + row.DATA);
             callback(true);}
        }
    ],*/
    writer: {
        listen: 9090
    },
    consumer_function: rely('http://localhost:9090'),
    index: 1  
};
module.exports = config;
