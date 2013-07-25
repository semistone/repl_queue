/**
 * rely consumer
 *
 */
var url = require('url'),
    http = require('http'),
    SOCKET_TIMEOUT = 2000;

/**
 * do task
 *
 */
var consumer_function = function (row, callback) {//{{{
    "use strict";
    var req_id = row.REQUEST_ID,
        options,
        req;
    if (!req_id) {
        req_id = row.ID;
    }
    options = {
        protocol: this.options.protocal,
        method: 'POST',
        agent: this.agent,
        hostname: this.options.hostname,
        port: this.options.port,
        heads: {
            'Connection': 'Keep-Alive'
        },
        path: this.options.path + '/' + row.CMD + '/' + req_id
    };
    console.log('[rest reader]rely id :' + row.ID + " data:" + row.DATA + ' to ' + options.hostname + options.path);
    req = http.request(options, function (res) {
        if (res.statusCode === 200) {
            console.log('[rest reader]http rely success for id:' + row.ID);
            callback(true, row);
        } else {
            console.log('[rest reader]http rely fail');
            callback(false, row);
        }
        res.on('data', function (data) {
        });
        res.on('end', function () {});
    });
    req.setSocketKeepAlive(true, 1000);
    req.setTimeout(SOCKET_TIMEOUT, function () {
        console.log('[rest reader]http connected and timeout for id:' + row.ID);
        callback(false, row);
    });
    req.on('error', function () {
        console.log('[rest reader] request error for id:' + row.ID);
        callback(false, row);
    });
    req.write(row.DATA);
    req.end();
};//}}}

/**
 * constructor
 */
var constructor = function (rely_to) {//{{{
    "use strict";
    this.agent = new http.Agent();
    this.agent.maxSockets = 1;
    console.log('[rest reader]rely to ' + rely_to);
    this.options = url.parse(rely_to);
    console.log('[rest reader]hostname is ' + this.options.hostname);
    console.log('[rest reader]port is ' + this.options.port);
    this.consumer_function = consumer_function;
};//}}}

module.exports = constructor;
