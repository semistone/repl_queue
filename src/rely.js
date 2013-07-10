/**
 * rely consumer
 *
 */
var options,
    url = require('url'),
    http = require('http');
var SOCKET_TIMEOUT = 2000;
//var i = 0;
/**
 *
 */
var do_task =  function(row, callback){
    // for testing 
    /*
    i++;
    if (i > 10) {
        callback(false);
        return;
    }
    */
    var req_id = row.REQUEST_ID;
    if (!req_id) {
       req_id = row.ID; 
    }
    var _options = {
        protocol: options.protocal,
        method: 'POST',
        hostname: options.hostname,
        agent: false, // can not reuse socket ... may fix later.
        port: options.port,
        path: '/' + row.CMD + '/' + req_id
    };
    console.log('rely id :' + row.ID + " data:" + row.DATA + ' to ' + _options.hostname + _options.path);
    var req = http.request(_options, function(res) {
        if (res.statusCode == 200) {
            console.log('http rely success for id:' + row.ID);
            callback(true);
        } else {
            console.log('http rely fail');
            callback(false);
        } 
    });
    req.setTimeout(SOCKET_TIMEOUT, function(){
        console.log('http connected and timeout for id:' + row.ID);
        callback(false);
    });
    req.write(row.DATA);
    req.end();
};

/**
 *
 */
var rely = function(rely_to){
    console.log('rely to ' + rely_to);
    options = url.parse(rely_to);
    console.log('hostname is ' + options.hostname);
    console.log('port is ' + options.port);
    return do_task;
};

module.exports = rely;
