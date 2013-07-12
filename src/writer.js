/**
 * simple http to write post body into
 *   sqlite
 *
 *  todo: authenticate method or acl
 */
var http = require('http'),
    socket_io = require('socket.io'),
    sqlite3 = require('sqlite3').verbose(),
    sql = require('./sql.js'),
    config = require('./example/config.js'),
    socketlist = [];
var match = /\/([^\/]*)\/?([^\/]*)/,
    server,
    volume = new sqlite3.cached.Database(config.path + '/volume.db');

/**
 * socket io handler
 *
 */
var io_handler = function(){//{{{
    var io = socket_io.listen(server);
    io.sockets.on('connection', function (socket){
        console.log('socket connected');
        socket.on('repl', function(row, insert_callback){
            volume.run(sql.INSERT_VOLUME_SQL,
                       [row.ID, row.CMD, row.DATA, new Date().getTime()/1000],
                       insert_callback);
        });
        socketlist.push(socket);
        socket.on('close', function(){
            console.log('disconnect');
            socketlist.splice(socketlist.indexOf(socket), 1);
        });
    });
};//}}}


/*
 * http request handler
 *
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
        var cmd = cmd_and_id[1];
        var req_id = cmd_and_id[2];
        req.on('data', function (data) {
            body += data;
        });
        /**
         * call after insert sqlite success.
         */
        var insert_callback = function(err){//{{{
            if (err){
                console.log('insert result ' + err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
            } else {
                console.log('insert success for cmd:'+cmd);
                res.writeHead(200, { 'Content-Type': 'application/json' });
            }
            res.end();
        };//}}}

        req.on('end', 
               function (){
                   volume.run(sql.INSERT_VOLUME_SQL,
                              [req_id, cmd, body, new Date().getTime()/1000],
                              insert_callback);}
              );
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
   server.close(function(){
       console.log('writer listen ' + config.writer.listen + ' killed');
   });
   //
   // close socket
   // 
   socketlist.forEach(function(socket) {
       console.log('socket disconect');
       socket.disconnect();
   });
   volume.close();
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
    if (config.writer == undefined) {
        console.log('writer not exist');
        return;
    }
    var handler = undefined;
    if(config.writer.rest_handler_enable == true) {
        console.log('rest handler enabled');
        handler = http_handler;
    }
    server = http.createServer(handler).listen(config.writer.listen);
    // enable socketio
    //
    if (config.writer.socketio_handler_enable == true) {
        console.log('socket io handler enabled');
        io_handler();
    }
    binding_signal();
})()//}}}
