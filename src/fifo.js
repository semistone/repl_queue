var constants = require('./constants.js'),
    Emitter = require('events').EventEmitter,
    sql = constants.sql,
    sqlite3 = require('sqlite3').verbose(),
    DELIMITER = '/',
    killed = false,
    fifos = {};

/**
 * consume result callback
 * if  success 
 *    update meta and emit next event
 * else 
 *    retry, if retry too many times then throw error 
 *       
 */
var consume_result_callback = function () {
    "use strict";
    var self = this;
    return function (consume_status, row) { //{{{ do consume
        var update_meta_finish,
            retry = 0;
        /**
         * call when task finish and update meta finish
         *
         * @return has_next
         */
        update_meta_finish = function (row) {//{{{
            console.log('update meta finish id:' + row.ID);
            self.remain_cnt = self.remain_cnt - 1;
            if (self.check_kill(killed)) {
                return false;
            }
            if (self.remain_cnt === 0) {
                self.finish_callback(self.queue_size, self.rowID);
                self.processing = false;
                return false;
            }
            return true;
        };//}}}

        if (consume_status) { // task done and success
            console.log('consume success for id:' + row.ID);
            self.rowID = row.ID;
            self.meta.run(sql.UPDATE_META_SQL, [row.ID, self.index], function () {
                if (update_meta_finish(row)) { // has next
                    self.event_emitter.emit('next');
                }
            });
        } else { // task fail
            console.log('consume false retry:' + retry + ' for id:' + row.ID);
            retry = retry + 1;
            if (retry > constants.settings.MAX_RETRY) {
                throw new Error('retry to many times');
            }
            if (self.check_kill(killed)) {
                return;
            }
            //
            // delay call
            //
            setTimeout(function () {
                self.reader.consumer_function(row, self.consume_result_callback()); // self = function (consume_status) itself
            }, constants.settings.RETRY_INTERVAL);
        }
    };//}}}
};

/**
 * serialize execute task.
 *
 */
var sequence_task = function () {//{{{
    "use strict";
    var row,
        self = this;
    console.log('do sequence task, remain task size ' + this.working_queue.length);
    if (this.working_queue.length === 0) { // all task done
        return;
    }
    row = this.working_queue.shift();
    console.log('consume row ' + row.ID);
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
    var reader_setting;
    fifos[index] = this;
    console.log('index is ' + index);
    reader_setting = config.reader[index].consumer_function;
    if (reader_setting === undefined) {
        throw new Error('consumer_function is undefined');
    }
    this.index = index;
    this.reader = new reader_setting[0](reader_setting[1]);
    this.meta = new sqlite3.cached.Database(config.path + DELIMITER + 'meta.db');
};//}}}

/**
 *
 *
 */
var each_complete_callback = function (working_queue, finish_callback) {//{{{
    "use strict";
    var self = this;
    this.working_queue = working_queue;
    this.finish_callback = finish_callback;
    return function (err, rows) {//{{{
        self.processing = true;
        console.log('select result size for index ' + self.index + ' is ' + rows);
        self.queue_size = self.remain_cnt = rows;
        if (rows === undefined || rows === 0) { // check empty result.
            console.log('empty rows');
            finish_callback(0);
            self.processing = false;
            return;
        }

        self.event_emitter.on('next', function () {
            self.sequence_task();
        });
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
var check_kill = function (killed) {//{{{
    "use strict";
    if (killed) {
        console.log('fifo killed event fired');
        this.event_emitter.removeAllListeners();
        killed();
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
    var cnt = Object.keys(fifos).length, i;
    console.log('kill fifo current cnt is ' + cnt);
    if (cnt === undefined) {
        console.log('fifo next init yet');
        callback();
    }
    for (i in fifos) {
        if (fifos.hasOwnProperty(i)) {
            if (!fifos[i].processing) {
                cnt = cnt - 1;
                console.log('fifo task not processing cnt is ' + cnt);
                if (cnt === 0) {
                    callback();
                }
            }
        }
    }
    killed = function () {
        console.log('fifo task killed');
        cnt = cnt - 1;
        if (cnt === 0) {
            callback();
        }
    };
};//}}}

module.exports.FIFO = FIFO;
module.exports.kill = kill;

(function () {//{{{
    "use strict";
    FIFO.prototype = {
        processing: false,
        working_queue: undefined,
        queue_size: 0,
        remain_cnt: 0,
        each_complete_callback: each_complete_callback,
        event_emitter: new Emitter(),
        check_kill: check_kill,
        sequence_task: sequence_task,
        consume_result_callback: consume_result_callback
    };
}());//}}}
