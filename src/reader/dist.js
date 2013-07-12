/**
 * dist consumer
 *
 */
var options,
    url = require('url'),
    sqlite3 = require('sqlite3').verbose(),
    sql = require('../sql.js'),
    volume;
/**
 *
 */
var do_task =  function(row, callback){
    var req_id = row.REQUEST_ID;
    if (!req_id) {
       req_id = row.ID; 
    }
    console.log('save id :' + row.ID + " data:" + row.DATA);
    volume.run(sql.INSERT_VOLUME_SQL,
               [req_id, row.CMD, row.DATA, new Date().getTime()/1000],
               function(err){
                   if(err){
                       console.log(err); 
                       callback(false);
                   }else{
                       callback(true);
                   }
               });
};

/**
 *
 */
var dist = function(dist_to){
    console.log('save to ' + dist_to);
    volume = new sqlite3.cached.Database(dist_to);
    volume.run(sql.CREATE_SQL);
    return do_task;
};

module.exports = dist;
