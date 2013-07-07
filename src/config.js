config = {
    path: '.',
    consume_msg_callback: function(row, callback){
        console.log('consume:' + row.ID + " data:" + row.DATA);
        callback(true);
    },
    index: 1  
};
module.exports = config;
