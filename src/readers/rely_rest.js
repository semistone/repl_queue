/**
 * rely consumer
 *
 */
var url = require('url'),
    http = require('http');
var SOCKET_TIMEOUT = 2000;

/**
 * do task
 *
 */
var consumer_function =  function(row, callback){//{{{
    var req_id = row.REQUEST_ID;
    if (!req_id) {
       req_id = row.ID; 
    }
    var _options = {
        protocol: this.options.protocal,
        method: 'POST',
        agent: this.agent,
        hostname: this.options.hostname,
        port: this.options.port,
        heads:{
            'Connection': 'Keep-Alive'
        },
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
        res.on('data', function(data){
        }); 
        res.on('end', function(){}); 
    });
    req.setSocketKeepAlive(true, 1000);
    req.setTimeout(SOCKET_TIMEOUT, function(){
        console.log('http connected and timeout for id:' + row.ID);
        callback(false);
    });
    req.on('error', function(){
        console.log('request error for id:' + row.ID);
        callback(false);
    });
    req.write(row.DATA);
    req.end();
};//}}}

/**
 * constructor
 */
var constructor = function(rely_to){//{{{
    this.agent = new http.Agent;
    this.agent.maxSockets = 1;
    console.log('rely to ' + rely_to);
    this.options = url.parse(rely_to);
    console.log('hostname is ' + this.options.hostname);
    console.log('port is ' + this.options.port);
    this.consumer_function = consumer_function;
};//}}}

module.exports = constructor;
