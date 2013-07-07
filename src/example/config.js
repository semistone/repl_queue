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
    consume_msg_callback: function(row, callback){
        console.log('consume:' + row.ID + " data:" + row.DATA);
        callback(true);
    },
    index: 1  
};
module.exports = config;
