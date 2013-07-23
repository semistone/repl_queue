var io = require('socket.io-client'),
    url = require('url');

/**
 * consumer function
 */
var consumer_function =  function (row, callback) {//{{{
    "use strict";
    if (!this.connect_status) {
        console.log('disconnected');
        callback(false, row);
    }
    this.socket.emit('write', row, function (err) {
        callback(!err, row);
    });
};//}}}

/**
 * kill 
 *
 */
var kill = function () {//{{{
    "use strict";
    if (this.socket && this.connect_status) {
        this.socket.disconnect();
        this.socket = undefined;
    }
};//}}}

/**
 * rely through socket io constructor
 */
var constructor = function (rely_to) {//{{{
    "use strict";
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


module.exports = constructor;
