var fs = require('fs'),
    Emitter = require('events').EventEmitter,
    sqlite3 = require('sqlite3').verbose(),
    DB = require('./db.js'),
    constants = require('./constants.js'),
    sql = constants.sql,
    fifo_module = require('./fifo.js'),
    config = require('./example/config.js'),
    DELIMITER = '/',
    VOLUME_SIZE = constants.settings.VOLUME_SIZE,
    index_handlers = {};
/**
 * loop message from sql
 */
var get_last_record_and_loop_message = function (index, finish_callback) {//{{{
    "use strict";
    var last_update_rows = 0,
        working_queue = [],
        loop_message,
        self = this,
        retry = 0,
        fifo = new fifo_module.FIFO(config, index);
    /**
     * use fifo sub module to consume working queue.
     */
    this.each_complete_callback = fifo.each_complete_callback(working_queue, finish_callback);

    /**
     * loop message
     *
     */
    loop_message = function (last_record) {//{{{
        self.db.volume.each(sql.SELECT_SQL, [last_record], function (err, row) {
            if (err) {
                console.log('query next record error:' + err + ' reopen again');
                self.db.create_volume_db(function () {
                    console.log('retry');
                    retry = retry + 1;
                    if (retry < constants.settings.MAX_RETRY) {
                        loop_message(last_record);
                    }
                }, sqlite3.OPEN_READONLY);
                return;
            }
            retry = 0;
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
            console.log('last record for index ' + index + ' is ' + row.LAST_RECORD);
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
        if (self.killed) { // killed signal fired, stop loop.
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
            if (rowID > VOLUME_SIZE) {
                console.log('current row id is ' + rowID);
                self.db.volume.get(sql.CHECK_FINISH_VOLUME, [rowID], function (err, row) {
                    if (err) {
                        console.log('not match last record yet err ' + err);
                        return;
                    }
                    if (row.CNT > 0) {
                        console.log("change to next volume");
                        self.db.rotate_reader(function (err) { // rotate success then continue loop
                            if (err) {
                                console.log('rotate error ' + err);
                                return;
                            }
                            self.get_last_record_and_loop_message(self.index, finish_callback);
                        });
                    } else {
                        console.log('not match last record yet');
                    }
                });
            } else {
                console.log('set processing false');
                self.processing = false;
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
var Reader = function (index) {//{{{
    "use strict";
    var self = this;
    this.processing = false; // if message loop is processing
    this.index = index;
    this.db = new DB(config, function () {
        self.db.init_reader(index, function () {
            self.loop_scan_message();
        });
    });
    this.binding_signal();
};//}}}



/**
 * kill or stop reading queue. 
 *
 */
var kill = function () {//{{{
    "use strict";
    var self = this;
    this.killed = true;
    fifo_module.kill(function () {
        self.db.kill();
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
    Reader.prototype = {
        'loop_scan_message': loop_scan_message,
        'get_last_record_and_loop_message': get_last_record_and_loop_message,
        'binding_signal': binding_signal,
        'kill': kill,
        'killed': false, // if kill signal fired, then killed = true
    };
    console.log('init reader ' + config.reader);
    for (index in config.reader) {
        if (config.reader.hasOwnProperty(index)) {
            index_handlers[index] = new Reader(index);
        }
    }
}());//}}}
