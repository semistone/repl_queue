var DELIMITER = '/';
var fs = require('fs');                                                                        
var config = {
    path: '.',
    file: 'test.db',
    consume_msg_callback: function(row, callback){
        console.log('consume:' + row.ID + " data:" + row.DATA);
        callback(true);
    },
    index: 1  
}
var volume_file = config.path + DELIMITER + config.file;
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(volume_file);
var CREATE_SQL = "create table if not exists QUEUE_VOLUME (\n"
    CREATE_SQL += "ID INTEGER PRIMARY KEY ASC, \n"
    CREATE_SQL += " CMD TEXT,\n"
    CREATE_SQL += " CONTENT_TYPE TEXT,\n"
    CREATE_SQL += " USER_ID TEXT,\n"
    CREATE_SQL += " DATA TEXT,\n"
    CREATE_SQL += " CREATED INTEGER\n"
    CREATE_SQL += " )";
var CREATE_META_SQL = "create table if not exists QUEUE_META (\n"
    CREATE_META_SQL += "    ID text PRIMARY KEY,\n"
    CREATE_META_SQL += "    LAST_RECORD int\n"
    CREATE_META_SQL += ")";

var SELECT_SQL = "select * from QUEUE_VOLUME where ID > ? order by ID asc limit 10";
var SELECT_META_SQL = "select * from QUEUE_META where ID = ?";
var INSERT_META_SQL = "insert into QUEUE_META values(?, 0)";
var UPDATE_META_SQL = "update QUEUE_META set LAST_RECORD=? where ID=?";
var processing = false; // if message loop is processing
/**
 * if last update rows != 0, then keep going.
 *
 */
var loop_scan_message = function(){
    if (processing) {
        console.log('i am processing');
        return;
    }
    processing = true;
    var finish_callback = function(rows){
        console.log('finish callback');
        if (rows != 0) {
            get_last_record_and_loop_message(arguments.callee /* finish_callback*/);
        } else {
            console.log('end loop');
            processing = false;
        }
    };
    get_last_record_and_loop_message(finish_callback);
}

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
                        db.run(UPDATE_META_SQL, [row.ID, config.index], update_meta_finish);
                    });
                    arguments.callee.caller.caller(); /* recursive sequence_task() */
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
        db.each(SELECT_SQL, [last_record], function(err, row){
            working_queue.push(row);
            update_cnt++;
            console.log('push id ' + row.ID);
        }, each_complete_callback);
    };

    /**
     * get last record and start loop message.
     *
     */
    db.get(SELECT_META_SQL, [config.index],function(error, row) {
        tableExists = (row != undefined);
        if (!tableExists) {
            db.run(INSERT_META_SQL, [config.index], function(){
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
 * init tables
 */
var init_db = function(){
    db.serialize(function() {
        db.run(CREATE_SQL);
        db.run(CREATE_META_SQL);
        start_run();
    });
}

/**
 * start watch db file 
 *
 */
var start_run = function(last_record){
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

init_db();
//db.close();
