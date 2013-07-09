/**
 * limit ip to access writer 
 *
 */
var _allow_ip;
var filter = function(req){
    return req.connection.remoteAddress == _allow_ip
};

var ip_acl = function(allow_ip){
    _allow_ip = allow_ip;
    return filter;
};

module.exports = ip_acl;
