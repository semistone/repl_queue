var fs = require('fs'),
    emitter = require('events').EventEmitter,
    sqlite3 = require('sqlite3').verbose(),
    sql = require('./sql.js'),
    fifo = require('./fifo.js'),
    config = require('./example/config.js');

var DELIMITER = '/',
    volume_file = config.path + DELIMITER + 'volume.db',
    volume = new sqlite3.cached.Database(config.path + DELIMITER + 'volume.db'),
    meta = new sqlite3.cached.Database(config.path + DELIMITER + 'meta.db'),
    processing = false; // if message loop is processing
    killed = false; // if kill signal fired, then killed = true

/**
 * loop message from sql
 */
var get_last_record_and_loop_message = function(finish_callback) {
    var last_update_rows = 0;
    var working_queue = [];
    /**
     * use fifo sub module to consume working queue.
     */
    var each_complete_callback = fifo.each_complete_callback(working_queue, config, finish_callback);

    /**
     * loop message
     *
     */
    var loop_message = function(last_record){
        volume.each(sql.SELECT_SQL, [last_record], function(err, row){
            working_queue.push(row);
            console.log('push id ' + row.ID);
        }, each_complete_callback);
    };

    /**
     * get last record and start loop message.
     *
     */
    meta.get(sql.SELECT_META_SQL, [config.index],function(error, row) {
        tableExists = (row != undefined);
        if (!tableExists) {
            meta.run(sql.INSERT_META_SQL, [config.index], function(){
                console.log("insert meta done");    
                loop_message(0);
            });
        } else {
            console.log('last record is ' + row.LAST_RECORD);
            loop_message(row.LAST_RECORD);
        }
    });
}

/**
 * if last update rows != 0, then keep going.
 *
 */
var loop_scan_message = function(){
    var finish_event_emitter = new emitter(),
        finish_callback;

    if (processing) {
        console.log('i am processing');
        return;
    }
    processing = true;
    finish_callback = function(rows){
        console.log('finish callback');
        if (killed) { // killed signal fired, stop loop.
            finish_event_emitter.removeAllListeners();
            return;
        }
        if (rows != 0) {
            get_last_record_and_loop_message(function(rows){
                console.log('emit finish event, last loop consume rows '+rows);
                finish_event_emitter.emit('finish', rows);         
            });
        } else {
            console.log('end scan message and stop processing');
            processing = false;
        }
    };
    finish_event_emitter.addListener('finish', finish_callback);
    get_last_record_and_loop_message(finish_callback);
};

/**
 * start watch db file  -> loop_scan_message
 *
 */
var watchfile= function(){
    console.log("watching " + volume_file);
    loop_scan_message();
    fs.watchFile(volume_file, function(curr,prev) {
        if (curr.mtime == prev.mtime) {
            console.log("mtime equal");
        } else {
            loop_scan_message();
            console.log("mtime not equal");
        }   
    });
}

/**
 * init tables 
 */
var init_db = function(){
    volume.run(sql.CREATE_SQL);
    meta.run(sql.CREATE_META_SQL);
};

/**
 * main 
 *
 */
init_db();
watchfile();

/**
 * save kill writer
 *
 */
var kill = function(){
    console.log('unwatch ' + volume_file);
    fs.unwatchFile(volume_file);
    killed = true;
    fifo.kill(function(){
        console.log('close volme.db');
        volume.close();
        console.log('close meta.db');
        meta.close();
    });
}
//db.close();


process.on('SIGINT', function(){
   console.log('fire SIGINT in reader');
   kill();
});
process.on('SIGHUP', function(){
   console.log('fire SIGHUP in reader');
   kill();
});
