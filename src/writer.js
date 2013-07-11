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
var acl = config.writer.acl,
    match = /\/([^\/]*)\/?([^\/]*)/;
var volume = new sqlite3.cached.Database(config.path + '/volume.db');
var server = http.createServer(function (req, res){
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
                              [req_id, cmd, body, new Date().getTime()/1000],
                              insert_callback);}
              );
    }else{
        console.log('only accept POST method');
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end();
    } 
}).listen(config.writer.listen);

/**
 * save kill writer
 *
 */
var kill = function(){
   server.close(function(){
       console.log('writer listen ' + config.writer.listen + ' killed');
   }); 
   volume.close();
}

process.on('SIGINT', function(){
   console.log('fire SIGINT in writer');
   kill();
});
process.on('SIGHUP', function(){
   console.log('fire SIGHUP in writer');
   kill();
});
