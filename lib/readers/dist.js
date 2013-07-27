/**
 * dist consumer
 *
 */
var url = require('url'),
    sqlite3 = require('sqlite3').verbose(),
    constants = require('../constants.js'),
    sql = constants.sql,
    DB = new require('../db.js');
/**
 *
 */
var consumer_function =  function (row, callback) {//{{{
    "use strict";
    var req_id = row.REQUEST_ID,
        insert_callback;
    if (!req_id) {
        req_id = row.ID;
    }
    insert_callback = function (err) {
        if (err === undefined) {
            callback(true, row);
        } else {
            callback(false, row);
        }
    };
    console.log('[dist]save id :' + row.ID + " data:" + row.DATA);
    this.db.insert(req_id, row.CMD, row.DATA, insert_callback);
};//}}}

/**
 * dist constructor 
 */
var Dist = function (dist_to) {//{{{
    "use strict";
    console.log('[dist]save to ' + dist_to);
    var self = this;
    this.db = new DB({
        path: dist_to,
    });
    this.db.init_writer(function(err){
        console.log('init success');
    });
};//}}}

var kill = function () {//{{{
    this.db.kill();
};//}}}

Dist.prototype = {//{{{
    consumer_function: consumer_function,
    kill: kill 
};//}}}

module.exports = Dist;
