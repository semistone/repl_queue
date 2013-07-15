var io = require('socket.io-client'),
    url = require('url');

/**
 *
 *
 */
var do_task =  function(row, callback){//{{{
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
var rely = function(rely_to){//{{{
    console.log('rely to ' + rely_to);
    var options = url.parse(rely_to);
    console.log('hostname is ' + options.hostname);
    console.log('port is ' + options.port);
    this.socket = io.connect(options.hostname, { port: options.port});
    this.socket.on('connect', function () {
        console.log("rely socket connected"); 
        this.connect_status = true;
    });
    this.socket.on('disconnect', function () {
        console.log("rely socket disconnected"); 
        this.connect_status = false;
    });
    this.consumer_function = do_task;
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

module.exports = rely;
