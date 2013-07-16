/**
 * simple http to write post body into
 *   sqlite
 *
 *  todo: authenticate method or acl
 */
var sqlite3 = require('sqlite3').verbose(),
    server = require('./server.js'),
    sql = require('./sql.js'),
    config = require('./example/config.js'),
    db = require('./db.js'),
    socketlist = [];
    match = /\/repl\/([^\/]*)\/([^\/]*)\/?([^\/]*)/;

var volume,
    db = new db(config);
    server = new server(config),
    closed = false;

/**
 * socket io handler
 *
 */
var io_handler = function(){//{{{
    var io = server.io.of('/repl_socket' + config.path);
    io.on('connection', function (socket){
        console.log('server socket connected');
        socket.on('write', function(row, insert_callback){
            db.insert(row.ID, row.CMD, row.DATA, inser_callback);
        });
        socketlist.push(socket);
        socket.on('close', function(){
            console.log('writer socket close');
            socketlist.splice(socketlist.indexOf(socket), 1);
        });
    });
};//}}}


/*
 * http request handler
 * 
 * @path /repl/$queue_id/$cmd/$req_id
 */
var http_handler = function (req, res){//{{{
    var acl = config.writer.acl;
    if (acl != undefined && acl(req) == false) {
        console.log('access deny');
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end();
        return;
    }
    if (req.method == 'POST') {
        console.log('new request ' + req.url);
        var body = '';
        var cmd_and_id = match.exec(req.url);
        var queue = cmd_and_id[1];
        var cmd = cmd_and_id[2];
        var req_id = cmd_and_id[3];
        req.on('data', function (data) {
            body += data;
        });
        /**
         * call after insert sqlite success.
         */
        var insert_callback = function(err){//{{{
            if (err){
                res.writeHead(500, { 'Content-Type': 'application/json' });
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
            }
            res.end();
        };//}}}

        req.on('end', function (){
            db.insert(req_id, cmd, body, insert_callback);
        });
    }else{
        console.log('only accept POST method');
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end();
    } 
};//}}}

/**
 * save kill writer
 *
 */
var kill = function(){//{{{
   if(closed) return;
   server.kill(function(){
       console.log('writer listen ' + config.server.listen + ' killed');
   });
   //
   // close socket
   // 
   socketlist.forEach(function(socket) {
       socket.disconnect();
       console.log('server socket disconnect');
   });
   volume.close();
   closed = true;
};//}}}

/**
 * binding kill signal
 *
 */
var binding_signal = function(){//{{{
    process.on('SIGINT', function(){
       console.log('fire SIGINT in writer');
       kill();
    });
    process.on('SIGHUP', function(){
       console.log('fire SIGHUP in writer');
       kill();
    });
};//}}}

/**
 * main
 */
(function(){//{{{
    db.init_volume(function(_volume_id, _volume){
        volume = _volume;
        if (config.writer == undefined) {
            console.log('writer not exist');
            return;
        }
        if(config.server.rest_handler_enable == true) {
            console.log('rest handler enabled');
            server.http.on('request', http_handler);
        }
        // enable socketio
        //
        if (config.server.socketio_handler_enable == true) {
            console.log('socket io handler enabled');
            io_handler();
        }
        binding_signal();
    });
})()//}}}
