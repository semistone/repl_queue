/**
 * simple http to write post body into
 *   sqlite
 *
 *
 */
var http = require('http'),
    sqlite3 = require('sqlite3').verbose(),
    sql = require('./sql.js'),
    config = require('./example/config.js');
if (config.writer == undefined) {
    console.log('writer not exist');
    return;
}
var volume = new sqlite3.cached.Database(config.path + '/volume.db');
http.createServer(function (req, res){
    if (req.method == 'POST') {
        var body = '';
        var cmd = req.url.substring(1);
        req.on('data', function (data) {
            body += data;
        });
        req.on('end', function () {
            volume.run(sql.INSERT_VOLUME_SQL,
                       [cmd, body, new Date().getTime()/1000],
                       function(err){
                if (err){
                    console.log('insert result ' + err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                }
                res.end();
            });
        });
    } 
}).listen(config.writer.listen);
