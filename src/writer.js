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
    config = require('./example/config.js'),
    DB = require('./db.js'),
    socketlist = [],
    match = /\/repl\/([a-z,A-Z]*)\/([a-z,A-Z]*)\/?([a-z,A-Z]*)/;

var db = new DB(config),
    server = new Server(config),
    closed = false;

/**
 * socket io handler
 *
 */
var io_handler = function () {//{{{
    "use strict";
    var io = server.io.of('/repl_socket' + config.path);
    io.on('connection', function (socket) {
        console.log('[writer]server socket connected');
        socket.on('write', function (row, insert_callback) {
            db.insert(row.ID, row.CMD, row.DATA, insert_callback);
        });
        socketlist.push(socket);
        socket.on('close', function () {
            console.log('[writer]writer socket close');
            socketlist.splice(socketlist.indexOf(socket), 1);
        });
    });
};//}}}


/*
 * http request handler
 * 
 * @path /repl/$queue_id/$cmd/$req_id
 */
var http_handler = function (req, res) {//{{{
    "use strict";
    var acl = config.writer.acl, body, cmd_and_id,
        queue, cmd, req_id, insert_callback;
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
            db.insert(req_id, cmd, body, insert_callback);
        });
    } else {
        console.log('[writer]only accept POST method');
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end();
    }
};//}}}

/**
 * save kill writer
 *
 */
var kill = function () {//{{{
    "use strict";
    if (closed) {
        return;
    }
    server.kill(function () {
        console.log('[writer]writer listen ' + config.server.listen + ' killed');
    });
    //
    // close socket
    // 
    socketlist.forEach(function (socket) {
        socket.disconnect();
        console.log('[writer]server socket disconnect');
    });
    db.kill();
    closed = true;
};//}}}

/**
 * binding kill signal
 *
 */
var binding_signal = function () {//{{{
    "use strict";
    process.on('SIGINT', function () {
        console.log('[writer]fire SIGINT in writer');
        kill();
    });
    process.on('SIGHUP', function () {
        console.log('[writer]fire SIGHUP in writer');
        kill();
    });
};//}}}

/**
 * main
 */
(function () {//{{{
    "use strict";
    db.init_writer(function () {
        if (config.writer === undefined) {
            console.log('[writer]writer not exist');
            return;
        }
        if (config.server.rest_handler_enable === true) {
            console.log('[writer]rest handler enabled');
            server.http.on('request', http_handler);
        }
        // enable socketio
        //
        if (config.server.socketio_handler_enable === true) {
            console.log('[writer]socket io handler enabled');
            io_handler();
        }
        binding_signal();
    });
}());//}}}
