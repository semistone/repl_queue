var fs = require('fs'),
    sqlite3 = require('sqlite3').verbose(),
    sql = require('./sql.js'),
    emitter = require('events').EventEmitter,
    config = {
        path: '.',
        file: 'test.db',
        consume_msg_callback: function(row, callback){
            console.log('consume:' + row.ID + " data:" + row.DATA);
            callback(true);
        },
        index: 1  
    };
var DELIMITER = '/',
    volume_file = config.path + DELIMITER + config.file,
    db = new sqlite3.Database(volume_file),
    processing = false; // if message loop is processing

/**
 * loop message from sql
 */
var get_last_record_and_loop_message = function(finish_callback) {
    var last_update_rows = 0;
    var update_cnt = 0;
    var complete = false; // complete loop
    var task_complete_callback = function(rows){
        last_update_rows = rows;
        complete = true;
    };
    var queue_size;
    var update_meta_finish = function(){
        console.log('update meta finish');
        update_cnt--;
        if (complete && update_cnt == 0) {
            finish_callback(last_update_rows);    
        }
    };
    var working_queue = [];

    /**
     * call when sqlite each loop finish.
     *
     */
    var each_complete_callback = function(err, rows){
        var event_emitter = new emitter();
        var sequence_task = function() {
            console.log('next task size ' + working_queue.length);
            if (working_queue.length == 0) { // all task done
                task_complete_callback(queue_size);
                return;
            }
            var row = working_queue.shift();
            console.log('consume row ' + row.ID);
            var retry = 0;
            config.consume_msg_callback(row, function(consume_status){ // do consume
                if (consume_status) {
                    console.log('consume success');
                    db.serialize(function() {
                        db.run(sql.UPDATE_META_SQL, [row.ID, config.index], function(){
                            update_meta_finish();
                            event_emitter.emit('next');
                        });
                    });
                }else{
                    console.log('consume false');
                    retry++;
                    if (retry > 3) {
                        throw new Exception('retry to many times');
                    }
                    config.consume_msg_callback(row, arguments.callee);
                }
            });
        };
        event_emitter.on('next', sequence_task);
        if (rows == 0) {
            console.log('empty rows');
            finish_callback(rows);
        }
        queue_size = working_queue.length;
        console.log('size is ' + queue_size);
        sequence_task(); 
    };
    
    /**
     * loop message
     *
     */
    var loop_message = function(last_record){
        db.each(sql.SELECT_SQL, [last_record], function(err, row){
            working_queue.push(row);
            update_cnt++;
            console.log('push id ' + row.ID);
        }, each_complete_callback);
    };

    /**
     * get last record and start loop message.
     *
     */
    db.get(sql.SELECT_META_SQL, [config.index],function(error, row) {
        tableExists = (row != undefined);
        if (!tableExists) {
            db.run(sql.INSERT_META_SQL, [config.index], function(){
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
        finish_callback,
        processing;

    if (processing) {
        console.log('i am processing');
        return;
    }
    processing = true;
    finish_callback = function(rows){
        console.log('finish callback');
        if (rows != 0) {
            get_last_record_and_loop_message(function(rows){
                console.log('emit finish event');
                finish_event_emitter.emit('finish', rows);         
            });
        } else {
            console.log('end loop');
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
 * init tables -> watchfile 
 */
var init_db = function(){
    db.serialize(function() {
        db.run(sql.CREATE_SQL);
        db.run(sql.CREATE_META_SQL);
        watchfile();
    });
};

/**
 * main 
 *
 */
init_db();
//db.close();
