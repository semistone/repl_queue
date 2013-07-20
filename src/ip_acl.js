/**
 * limit ip to access writer 
 *
 */
var allow_ip;
var filter = function (req) {
    "use strict";
    return req.connection.remoteAddress === allow_ip;
};

var ip_acl = function (a_allow_ip) {
    "use strict";
    allow_ip = a_allow_ip;
    return filter;
};

module.exports = ip_acl;
