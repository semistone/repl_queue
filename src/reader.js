var fs = require('fs'),
    emitter = require('events').EventEmitter,
    sqlite3 = require('sqlite3').verbose(),
    db = require('./db.js');
    sql = require('./sql.js'),
    fifo = require('./fifo.js'),
    config = require('./example/config.js');

var DELIMITER = '/',
    killed = false; // if kill signal fired, then killed = true
    index_handlers = {};
/**
 * loop message from sql
 */
var get_last_record_and_loop_message = function(index, finish_callback) {//{{{
    var last_update_rows = 0;
    var working_queue = [], self = this;
    /**
     * use fifo sub module to consume working queue.
     */
    this.each_complete_callback = new fifo.each_complete_callback(working_queue, config, index, finish_callback); 

    /**
     * loop message
     *
     */
    var loop_message = function(last_record){//{{{
        self.volume.each(sql.SELECT_SQL, [last_record], function(err, row){
            working_queue.push(row);
            console.log('push id ' + row.ID);
        }, self.each_complete_callback);
    };//}}}

    /**
     * get last record and start loop message.
     *
     */
    this.meta.get(sql.SELECT_META_SQL, [index],function(error, row) {
        tableExists = (row != undefined);
        if (!tableExists) {
            self.meta.run(sql.INSERT_META_SQL, [index, 0], function(){
                console.log("insert meta done");    
                loop_message(0);
            });
        } else {
            console.log('last record for ' + index +' is ' + row.LAST_RECORD);
            loop_message(row.LAST_RECORD);
        }
    });
};//}}}

/**
 * if previous consumed rows != 0, then keep going.
 * else stop processing.
 *
 */
var loop_scan_message = function(){//{{{
    var finish_event_emitter = new emitter(),
        finish_callback, self = this;

    if (this.processing) {
        console.log('i am processing');
        return;
    }
    this.processing = true;
    finish_callback = function(rows){
        console.log('finish callback');
        if (killed) { // killed signal fired, stop loop.
            finish_event_emitter.removeAllListeners();
            return;
        }
        if (rows != 0) {
            self.get_last_record_and_loop_message(self.index, function(rows){
                console.log('emit finish event, last loop consume rows '+rows);
                finish_event_emitter.emit('finish', rows);         
            });
        } else {
            console.log('end scan message and stop processing');
            self.processing = false;
        }
    };
    finish_event_emitter.addListener('finish', finish_callback);
    this.get_last_record_and_loop_message(this.index, finish_callback);
};//}}}

/**
 * index handle constructor, with method
 *     loop_scan_message
 *     get_last_record_and_loop_message
 *
 */
var index_handler = function(index){//{{{
    this.db = new db(config);
    this.processing = false; // if message loop is processing
    this.index = index;
    var self = this;
    this.db.init_reader(index, function(_volume_id, _volume, _meta){
        self.volume_file = config.path + DELIMITER + 'volume_' + _volume_id + '.db';
        self.volume = _volume;    
        self.meta = _meta;
        self.watchfile();
        self.binding_signal();
    });
};//}}}

/**
 * start watch db file  -> loop_scan_message
 *
 */
var watchfile= function(){//{{{
    console.log("watching " + this.volume_file);
    this.loop_scan_message();
    fs.watchFile(this.volume_file, function(curr,prev) {
        if (curr.mtime == prev.mtime) {
            console.log("mtime equal");
        } else {
            this.loop_scan_message();
            console.log("mtime not equal");
        }   
    });
}//}}}



/**
 * kill or stop reading queue. 
 *
 */
var kill = function(){//{{{
    console.log('unwatch ' + this.volume_file);
    fs.unwatchFile(this.volume_file);
    killed = true;
    fifo.kill(function(){
        console.log('close volme.db');
        this.volume.close();
        console.log('close meta.db');
        this.meta.close();
    });
};//}}}

/**
 * bind kill signal
 *
 */
var binding_signal = function(){//{{{
    process.on('SIGINT', function(){
       console.log('fire SIGINT in reader');
       this.kill();
    });
    process.on('SIGHUP', function(){
       console.log('fire SIGHUP in reader');
       this.kill();
    });
};//}}}



/**
 * main 
 *
 */
(function(){//{{{
    index_handler.prototype = {
        'loop_scan_message': loop_scan_message,
        'get_last_record_and_loop_message': get_last_record_and_loop_message,
        'watchfile': watchfile,
        'binding_signal': binding_signal,
        'kill': kill
    };

    for(var index in config.reader){
        index_handlers[index] = new index_handler(index);
    }
})();//}}}
