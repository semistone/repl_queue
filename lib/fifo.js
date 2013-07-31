var constants = require('./constants.js'),
    Emitter = require('events').EventEmitter,
    sql = constants.sql,
    sqlite3 = require('sqlite3').verbose(),
    DELIMITER = '/',
    fifos = {};

/**
 * call when task finish and update meta finish
 *
 * @return has_next
 */
var update_meta_finish = function (row) {//{{{
    "use strict";
    console.log('[fifo]update meta finish id:' + row.ID);
    this.remain_cnt = this.remain_cnt - 1;
    if (this.check_kill(this.killed, row)) {
        return false;
    }
    if (this.remain_cnt === 0) {
        this.finish_callback(this.queue_size, row.ID);
        this.processing = false;
        return false;
    }
    return true;
};//}}}
/**
 * consume result callback
 * if  success 
 *    update meta and emit next event
 * else 
 *    retry, if retry too many times then throw error 
 *       
 */
var consume_result_callback = function () {//{{{
    "use strict";
    var self = this,
        callback_func,
        retry = 0;
    callback_func = function (consume_status, row) { //{{{ do consume
        if (consume_status) { // task done and success
            console.log('[fifo]consume success for id:' + row.ID);
            self.rowID = row.ID;
            if (self.remain_cnt > 1) {
                console.log('[fifo]skip update meta remain ' + self.remain_cnt);
                if (self.update_meta_finish(row)) { // has next
                    self.event_emitter.emit('next');
                }
            } else {
                console.log('[fifo]update meta for id:' + row.ID);
                self.meta.run(sql.UPDATE_META_SQL, [row.ID, self.index], function () {
                    if (self.update_meta_finish(row)) { // has next
                        self.event_emitter.emit('next');
                    }
                });
            }
            retry = 0;
        } else { // task fail
            console.log('[fifo][' + self.index + ']consume false retry:' + retry + ' for id:' + row.ID);
            retry = retry + 1;
            if (retry > constants.settings.MAX_RETRY) {
                throw new Error('retry to many times');
            }
            if (self.check_kill(self.killed)) {
                return;
            }
            //
            // delay call
            //
            setTimeout(function () {
                self.reader.consumer_function(row, callback_func); // self = function (consume_status) itself
            }, constants.settings.RETRY_INTERVAL);
        }
    };//}}}
    return callback_func;
};//}}}

/**
 * serialize execute task.
 *
 */
var sequence_task = function () {//{{{
    "use strict";
    var row;
    console.log('[fifo][' + this.index + ']do sequence task, remain task size ' + this.working_queue.length);
    if (this.working_queue.length === 0) { // all task done
        return;
    }
    row = this.working_queue.shift();
    if (this.filter !== undefined && this.filter(row) === false) {
        console.log('[fifo] filter row ' + row.ID + ' not pass, callback as success.');
        (this.consume_result_callback())(true, row);
        return;
    }
    console.log('[fifo][' + this.index + ']consume row ' + row.ID);
    this.reader.consumer_function(row, this.consume_result_callback());
};//}}}

/**
 * Fifo consume constructor.
 * @args working_queue Array
 * @args config Object
 *
 * @return each_complete_callback
 */
var FIFO = function (config, index) {//{{{
    "use strict";
    var reader_setting,
        self = this;
    fifos[index] = this;
    console.log('[fifo]index is ' + index);
    reader_setting = config.reader[index].consumer_function;
    if (reader_setting === undefined) {
        throw new Error('consumer_function is undefined');
    }
    this.index = index;
    this.event_emitter = new Emitter();
    this.reader = new reader_setting[0](reader_setting[1]);
    this.filter = config.reader[index].filter;
    this.meta = new sqlite3.cached.Database(config.path + DELIMITER + 'meta.db');
    this.event_emitter.on('next', function () {
        self.sequence_task();
    });
};//}}}

/**
 *
 *
 */
var each_complete_callback = function (working_queue, finish_callback) {//{{{
    "use strict";
    var self = this;
    console.log('[fifo][' + this.index + '] init set working queue size ' + working_queue.length);
    this.working_queue = working_queue;
    this.finish_callback = finish_callback;
    return function (err, rows) {//{{{
        if (this.processing === true) {
            throw new Error('fifo still processing');
        }
        self.processing = true;
        console.log('[fifo]select result size for index ' + self.index + ' is ' + rows);
        self.queue_size = self.remain_cnt = rows;
        if (rows === undefined || rows === 0) { // check empty result.
            console.log('[fifo]empty rows');
            finish_callback(0);
            self.processing = false;
            return;
        }

        //
        // emit next event -> sequence_task -> consumer_function
        // after finish, then invoke finish_callback
        //
        self.event_emitter.emit('next');
    };//}}}
};//}}}


/**
 * if killed, then remove event emitter to prevent next event 
 */
var check_kill = function (killed, row) {//{{{
    "use strict";
    var self = this;
    if (killed) {
        console.log('fifo killed event fired');
        this.event_emitter.removeAllListeners();
        if (this.reader.kill !== undefined) {
            console.log('[fifo] invoke reader.kill()');
            this.reader.kill();
        }
        if (row !== undefined) { // update latest row into meta.
            console.log('[fifo]update latest row id into meta');
            this.meta.run(sql.UPDATE_META_SQL, [row.ID, self.index], function () {
                killed();
            });
        } else {
            killed();
        }
        return true;
    }
    return false;
};//}}}

/**
 * kill fifo executing task.
 *
 */
var kill = function (callback) {//{{{
    "use strict";
    this.killed = function () {
        if (this.reader.kill !== undefined) {
            console.log('[fifo] invoke reader.kill()');
            this.reader.kill();
        }
        callback();
    };
    if (this.processing === false) {
        this.killed();
    }
};//}}}

module.exports.FIFO = FIFO;

(function () {//{{{
    "use strict";
    FIFO.prototype = {
        processing: false,
        working_queue: undefined,
        queue_size: 0,
        remain_cnt: 0,
        each_complete_callback: each_complete_callback,
        check_kill: check_kill,
        sequence_task: sequence_task,
        consume_result_callback: consume_result_callback,
        update_meta_finish: update_meta_finish,
        kill: kill,
        killed: false
    };
}());//}}}
