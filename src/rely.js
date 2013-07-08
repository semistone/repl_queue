var options,
    url = require('url'),
    http = require('http');

/**
 *
 */
var do_task =  function(row, callback){
    console.log('rely id :' + row.ID + " data:" + row.DATA + ' to ' + options.href);
    var req = http.request(options, function(res) {
        if (res.statusCode == 200) {
            console.log('http connected and success');
            callback(true);
        } else {
            console.log('http connected and fail');
            callback(false);
        } 
    });
};

/**
 *
 */
var rely = function(rely_to){
    console.log('rely to ' + rely_to);
    options = url.parse(rely_to);
    options.method = 'POST';
    console.log('hostname is ' + options.hostname);
    console.log('port is ' + options.port);
    console.log('path is ' + options.path);
    return do_task;
};

module.exports = rely;
