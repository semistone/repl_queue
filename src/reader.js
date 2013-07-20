var fs = require('fs'),
    Emitter = require('events').EventEmitter,
    sqlite3 = require('sqlite3').verbose(),
    DB = require('./db.js'),
    sql = require('./sql.js'),
    fifo = require('./fifo.js'),
    config = require('./example/config.js'),
    DELIMITER = '/',
    killed = false, // if kill signal fired, then killed = true
    index_handlers = {};
/**
 * loop message from sql
 */
var get_last_record_and_loop_message = function (index, finish_callback) {//{{{
    "use strict";
    var last_update_rows = 0,
        working_queue = [],
        loop_message,
        self = this;
    /**
     * use fifo sub module to consume working queue.
     */
    this.each_complete_callback = new fifo.each_complete_callback(working_queue, config, index, finish_callback);

    /**
     * loop message
     *
     */
    loop_message = function (last_record) {//{{{
        self.db.volume.each(sql.SELECT_SQL, [last_record], function (err, row) {
            working_queue.push(row);
            console.log('push id ' + row.ID);
        }, self.each_complete_callback);
    };//}}}

    /**
     * get last record and start loop message.
     *
     */
    this.db.meta.get(sql.SELECT_META_SQL, [index], function (error, row) {
        var tableExists = (row !== undefined);
        if (!tableExists) {
            self.db.meta.run(sql.INSERT_META_SQL, [index, 0], function () {
                console.log("insert meta done");
                loop_message(0);
            });
        } else {
            console.log('last record for ' + index + ' is ' + row.LAST_RECORD);
            self.last_record = row.LAST_RECORD;
            loop_message(row.LAST_RECORD);
        }
    });
};//}}}

/**
 * if previous consumed rows != 0, then keep going.
 * else stop processing.
 *
 */
var loop_scan_message = function () {//{{{
    "use strict";
    var finish_event_emitter = new Emitter(),
        finish_callback,
        self = this;

    if (this.processing) {
        console.log('i am processing');
        return;
    }
    this.processing = true;
    finish_callback = function (rows, rowID) {
        console.log('finish callback');
        if (killed) { // killed signal fired, stop loop.
            finish_event_emitter.removeAllListeners();
            return;
        }
        if (rows !== 0) {
            self.get_last_record_and_loop_message(self.index, function (rows) {
                console.log('emit finish event, last loop consume rows ' + rows);
                finish_event_emitter.emit('finish', rows);
            });
        } else {
            if (rowID === undefined) {
                rowID = self.last_record;
            }
            console.log('end scan message and stop processing row id is ' + rowID);
            self.processing = false;
            if (rowID > 30) {
                console.log('current row id is ' + rowID);
                self.db.volume.get(sql.CHECK_FINISH_VOLUME, [rowID], function (err, row) {
                    if (row.CNT > 0) {
                        console.log("change to next volume");
                    } else {
                        console.log('not match last record yet');
                    }
                });
            }
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
var IndexHandler = function (index) {//{{{
    "use strict";
    var self = this;
    this.db = new DB(config);
    this.processing = false; // if message loop is processing
    this.index = index;
    this.db.init_reader(index, function () {
        if (self.db.is_latest) { // only latest file need to watch
            self.watchfile();
        } else {
            self.loop_scan_message();
        }
        self.binding_signal();
    });
};//}}}

/**
 * start watch db file  -> loop_scan_message
 *
 */
var watchfile = function () {//{{{
    "use strict";
    var self = this;
    console.log("watching " + this.db.volume_file);
    this.loop_scan_message();
    fs.watchFile(this.db.volume_file, function (curr, prev) {
        if (curr.mtime === prev.mtime) {
            console.log("mtime equal");
        } else {
            self.loop_scan_message();
            console.log("mtime not equal");
        }
    });
};//}}}



/**
 * kill or stop reading queue. 
 *
 */
var kill = function () {//{{{
    "use strict";
    var self = this;
    console.log('unwatch ' + this.db.volume_file);
    fs.unwatchFile(this.db.volume_file);
    killed = true;
    fifo.kill(function () {
        console.log('close volme.db');
        self.db.volume.close();
        console.log('close meta.db');
        self.db.meta.close();
    });
};//}}}

/**
 * bind kill signal
 *
 */
var binding_signal = function () {//{{{
    "use strict";
    var self = this;
    process.on('SIGINT', function () {
        console.log('fire SIGINT in reader');
        self.kill();
    });
    process.on('SIGHUP', function () {
        console.log('fire SIGHUP in reader');
        self.kill();
    });
};//}}}



/**
 * main 
 *
 */
(function () {//{{{
    "use strict";
    var index;
    IndexHandler.prototype = {
        'loop_scan_message': loop_scan_message,
        'get_last_record_and_loop_message': get_last_record_and_loop_message,
        'watchfile': watchfile,
        'binding_signal': binding_signal,
        'kill': kill
    };
    console.log('init reader ' + config.reader);
    for (index in config.reader) {
        if (config.reader.hasOwnProperty(index)) {
            index_handlers[index] = new IndexHandler(index);
        }
    }
}());//}}}
