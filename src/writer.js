/**
 * simple http to write post body into
 *   sqlite
 *
 *  todo: authenticate method or acl
 */
var sqlite3 = require('sqlite3').verbose(),
    Server = require('./server.js'),
    constants = require('./constants.js'),
    sql = constants.sql,
    DB = require('./db.js'),
    match = /\/repl\/([a-z,A-Z]*)\/([a-z,A-Z]*)\/?([a-z,A-Z]*)/;

/**
 * socket io handler
 *
 */
var io_handler = function () {//{{{
    "use strict";
    var io = this.server.io.of('/repl_socket' + this.config.path),
        self = this;
    io.on('connection', function (socket) {
        console.log('[writer]server socket connected');
        socket.on('write', function (row, insert_callback) {
            self.db.insert(row.ID, row.CMD, row.DATA, insert_callback);
        });
        self.socketlist.push(socket);
        socket.on('close', function () {
            console.log('[writer]writer socket close');
            self.socketlist.splice(self.socketlist.indexOf(socket), 1);
        });
    });
};//}}}


/*
 * http request handler
 * 
 * @path /repl/$queue_id/$cmd/$req_id
 */
var http_handler = function(){//{{{
    "use strict";
    var self = this,
        acl = this.config.writer.acl;
    return function (req, res) {//{{{
        var body,
            cmd_and_id,
            queue,
            cmd,
            req_id,
            insert_callback;
        if (acl !== undefined && acl(req) === false) {
            console.log('[writer]access deny');
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end();
            return;
        }
        if (req.method === 'POST') {
            console.log('[writer]new request ' + req.url);
            body = '';
            cmd_and_id = match.exec(req.url);
            queue = cmd_and_id[1];
            cmd = cmd_and_id[2];
            req_id = cmd_and_id[3];
            req.on('data', function (data) {
                body += data;
            });
            /**
             * call after insert sqlite success.
             */
            insert_callback = function (err) {//{{{
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                }
                res.end();
            };//}}}

            req.on('end', function () {
                self.db.insert(req_id, cmd, body, insert_callback);
            });
        } else {
            console.log('[writer]only accept POST method');
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end();
        }
    };//}}}
};//}}}

/**
 * save kill writer
 *
 */
var kill = function () {//{{{
    "use strict";
    var self = this;
    if (this.closed) {
        return;
    }
    this.server.kill(function () {
        console.log('[writer]writer listen ' + self.config.server.listen + ' killed');
    });
    //
    // close socket
    // 
    self.socketlist.forEach(function (socket) {
        socket.disconnect();
        console.log('[writer]server socket disconnect');
    });
    this.db.kill();
    this.closed = true;
};//}}}

/**
 * binding kill signal
 *
 */
var binding_signal = function () {//{{{
    "use strict";
    var self = this;
    process.on('SIGINT', function () {
        console.log('[writer]fire SIGINT in writer');
        self.kill();
    });
    process.on('SIGHUP', function () {
        console.log('[writer]fire SIGHUP in writer');
        self.kill();
    });
};//}}}

/**
 * main
 */
var Writer = function (config) {//{{{
    "use strict";
    var self = this;
    this.config = config;
    this.db = new DB(config);
    this.server = new Server(config);

    this.db.init_writer(function () {
        if (self.config.writer === undefined) {
            console.log('[writer]writer not exist');
            return;
        }
        if (self.config.server.rest_handler_enable === true) {
            console.log('[writer]rest handler enabled');
            self.server.http.on('request', self.http_handler());
        }
        // enable socketio
        //
        if (self.config.server.socketio_handler_enable === true) {
            console.log('[writer]socket io handler enabled');
            self.io_handler();
        }
        self.binding_signal();
    });
};//}}}

(function(){//{{{
    Writer.prototype = {
       closed: false,
       kill: kill,
       http_handler: http_handler,
       io_handler: io_handler,
       binding_signal: binding_signal,
       socketlist: [],
    };
}());//}}}

module.exports = Writer
