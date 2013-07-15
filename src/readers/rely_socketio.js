var io = require('socket.io-client'),
    url = require('url');

/**
 * consumer function
 */
var consumer_function =  function(row, callback){//{{{
    if(!this.connect_status){
        console.log('disconnected');
        callback(false); 
    }
    this.socket.emit('write', row, function(err){
        callback(!err);
    });
};//}}}

/**
 * rely through socket io constructor
 */
var constructor = function(rely_to){//{{{
    console.log('rely to ' + rely_to);
    this.socket = io.connect(rely_to);
    this.socket.on('connect', function () {
        console.log("rely socket connected"); 
        this.connect_status = true;
    });
    this.socket.on('disconnect', function () {
        console.log("rely socket disconnected"); 
        this.connect_status = false;
    });
    this.consumer_function = consumer_function;
    this.kill = kill;
};//}}}

/**
 * kill 
 *
 */
var kill = function(){//{{{
    if(this.socket && this.connect_status){
       this.socket.disconnect();
       this.socket = undefined;
    }
};//}}}

module.exports = constructor;
