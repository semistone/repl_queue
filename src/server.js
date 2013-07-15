var http = require('http');
/**
 * singleton for server and io
 *
 *
 */
var kill = function(fn){//{{{
    if(closed) return;
    this.server.close(fn);
    this.closed = true;

};//}}}

/**
 * init
 *
 */
var init = function(config) {
    this.closed = false;
    if ( arguments.callee._singletonInstance )
        return arguments.callee._singletonInstance;
    arguments.callee._singletonInstance = this;

    this.server = http.createServer().listen(config.writer.listen);
    if (config.writer.socketio_handler_enable == true) {
        var socket_io = require('socket.io');
        this.io = socket_io.listen(this.server);
    }
    this.kill =  kill;
    return this;
};

module.exports = init;
