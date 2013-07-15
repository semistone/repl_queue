var io = require('socket.io-client'),
    url = require('url'),
    connect_status = false,
    socket;

/**
 *
 *
 */
var do_task =  function(row, callback){//{{{
    if(!connect_status){
        console.log('disconnected');
        callback(false); 
    }
    socket.emit('write', row, function(err){
        callback(!err);
    });
};//}}}

/**
 *
 */
var rely = function(rely_to){//{{{
    console.log('rely to ' + rely_to);
    var options = url.parse(rely_to);
    console.log('hostname is ' + options.hostname);
    console.log('port is ' + options.port);
    socket = io.connect(options.hostname, { port: options.port});
    socket.on('connect', function () {
        console.log("rely socket connected"); 
        connect_status = true;
    });
    socket.on('disconnect', function () {
        console.log("rely socket disconnected"); 
        connect_status = false;
    });
    return do_task;
};//}}}

var kill = function(){//{{{
    if(socket && connect_status){
       socket.disconnect();
       socket = undefined;
    }
};//}}}

/**
 * bining kill signal
 */
var binding_signal = function(){//{{{
    process.on('SIGINT', function(){
       console.log('fire SIGINT in reader');
       kill();
    });
    process.on('SIGHUP', function(){
       console.log('fire SIGHUP in reader');
       kill();
    });
};//}}}

binding_signal();
module.exports = rely;