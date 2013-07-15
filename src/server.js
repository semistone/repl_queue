var http = require('http');
/**
 * singleton for server and io
 *
 *
 */
var kill = function(fn){//{{{
    if(closed) return;
    this.http.close(fn);
    this.closed = true;
    this.http = undefined;
};//}}}

/**
 * init
 *
 */
var init = function(config) {//{{{
    this.closed = false;
    if ( arguments.callee._singletonInstance )
        return arguments.callee._singletonInstance;
    arguments.callee._singletonInstance = this;

    this.http = http.createServer().listen(config.server.listen);
    if (config.writer.socketio_handler_enable == true) {
        var socket_io = require('socket.io');
        this.io = socket_io.listen(this.http);
        this.io.static = false;
    }

    this.http.on('close', function(){
        console.log('server closed');        
    });
    this.kill =  kill;
    return this;
};//}}}

module.exports = init;
