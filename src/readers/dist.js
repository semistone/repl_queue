/**
 * dist consumer
 *
 */
var url = require('url'),
    sqlite3 = require('sqlite3').verbose(),
    sql = require('../sql.js');
/**
 *
 */
var consumer_function =  function (row, callback) {//{{{
    "use strict";
    var req_id = row.REQUEST_ID,
        insert_callback;
    insert_callback = function (err) {
        if (err) {
            console.log(err);
            callback(false);
        } else {
            callback(true);
        }
    };
    if (!req_id) {
        req_id = row.ID;
    }
    console.log('save id :' + row.ID + " data:" + row.DATA);
    this.volume.run(sql.INSERT_VOLUME_SQL,
               [req_id, row.CMD, row.DATA, new Date().getTime() / 1000],
               insert_callback);
};//}}}

/**
 * dist constructor 
 */
var constructor = function (dist_to) {//{{{
    "use strict";
    console.log('save to ' + dist_to);
    this.volume = new sqlite3.cached.Database(dist_to);
    this.volume.run(sql.CREATE_SQL);
    this.consumer_function = consumer_function;
};//}}}

module.exports = constructor;
