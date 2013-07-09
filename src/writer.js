/**
 * simple http to write post body into
 *   sqlite
 *
 *  todo: authenticate method or acl
 */
var http = require('http'),
    sqlite3 = require('sqlite3').verbose(),
    sql = require('./sql.js'),
    config = require('./example/config.js');
if (config.writer == undefined) {
    console.log('writer not exist');
    return;
}
var acl = config.writer.acl;
var volume = new sqlite3.cached.Database(config.path + '/volume.db');
http.createServer(function (req, res){
    if (acl != undefined && acl(req) == false) {
        console.log('access deny');
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end();
        return;
    }
    if (req.method == 'POST') {
        console.log('new request');
        var body = '';
        var cmd = req.url.substring(1);
        req.on('data', function (data) {
            body += data;
        });
        /**
         * call after insert sqlite success.
         */
        var insert_callback = function(err){
            if (err){
                console.log('insert result ' + err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
            } else {
                console.log('insert success for cmd:'+cmd);
                res.writeHead(200, { 'Content-Type': 'application/json' });
            }
            res.end();
        };
        req.on('end', 
               function (){
                   volume.run(sql.INSERT_VOLUME_SQL,
                              [cmd, body, new Date().getTime()/1000],
                              insert_callback);}
              );
    }else{
        console.log('only accept POST method');
        res.end();
    } 
}).listen(config.writer.listen);
