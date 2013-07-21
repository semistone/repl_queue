var constants = require('./constants.js'),
    Emitter = require('events').EventEmitter,
    sql = constants.sql,
    sqlite3 = require('sqlite3').verbose(),
    DELIMITER = '/',
    killed = false,
    fifos = {};

/**
 * Fifo consume constructor.
 * @args working_queue Array
 * @args config Object
 *
 * @return each_complete_callback
 */
var fifo = function (working_queue, config, index, finish_callback) {//{{{
    "use strict";
    var self = this,
        reader_setting,
        reader,
        meta,
        queue_size = 0,
        remain_cnt = 0,
        each_complete_callback;
    this.processing = false;
    fifos[index] = this;

    console.log('index is ' + index);
    reader_setting = config.reader[index].consumer_function;
    if (reader_setting === undefined) {
        throw new Error('consumer_function is undefined');
    }
    reader = new reader_setting[0](reader_setting[1]);
    meta = new sqlite3.cached.Database(config.path + DELIMITER + 'meta.db');


    /**
     * db.each(select)'s callback function
     *
     */
    each_complete_callback = function (err, rows) {//{{{
        var check_kill,
            sequence_task,
            event_emitter = new Emitter();
        self.processing = true;
        console.log('select result size for index ' + index + ' is ' + rows);
        queue_size = remain_cnt = rows;
        if (rows === undefined || rows === 0) { // check empty result.
            console.log('empty rows');
            finish_callback(0);
            self.processing = false;
            return;
        }
        //
        // if killed, then remove event emitter to prevent next event 
        //
        check_kill = function (killed) {//{{{
            if (killed) {
                console.log('fifo killed event fired');
                event_emitter.removeAllListeners();
                killed();
                return true;
            }
            return false;
        };//}}}

        /**
         * serialize execute task.
         *
         */
        sequence_task = function () {//{{{
            var row,
                consume_result_callback,
                retry = 0;
            console.log('do sequence task, remain task size ' + working_queue.length);
            if (working_queue.length === 0) { // all task done
                return;
            }
            row = working_queue.shift();
            console.log('consume row ' + row.ID);


            /**
             * consume result callback
             * if  success 
             *    update meta and emit next event
             * else 
             *    retry, if retry too many times then throw error 
             *       
             */
            consume_result_callback = function (consume_status) { //{{{ do consume
                var update_meta_finish;
                /**
                 * call when task finish and update meta finish
                 *
                 * @return has_next
                 */
                update_meta_finish = function (row) {//{{{
                    console.log('update meta finish id:' + row.ID);
                    remain_cnt--;
                    if (check_kill(killed)) {
                        return false;
                    }
                    if (remain_cnt === 0) {
                        finish_callback(queue_size, self.rowID);
                        self.processing = false;
                        return false;
                    }
                    return true;
                };//}}}

                if (consume_status) { // task done and success
                    console.log('consume success for id:' + row.ID);
                    self.rowID = row.ID;
                    meta.run(sql.UPDATE_META_SQL, [row.ID, index], function () {
                        if (update_meta_finish(row)) { // has next
                            event_emitter.emit('next');
                        }
                    });
                } else { // task fail
                    console.log('consume false retry:' + retry + ' for id:' + row.ID);
                    retry++;
                    if (retry > constants.settings.MAX_RETRY) {
                        throw new Error('retry to many times');
                    }
                    if (check_kill(killed)) {
                        return;
                    }
                    //
                    // delay call
                    //
                    setTimeout(function () {
                        reader.consumer_function(row, consume_result_callback); // self = function (consume_status) itself
                    }, constants.settings.RETRY_INTERVAL);
                }
            };//}}}
            reader.consumer_function(row, consume_result_callback);
        };//}}}

        event_emitter.on('next', sequence_task);
        //
        // emit next event -> sequence_task -> consumer_function
        // after finish, then invoke finish_callback
        //
        event_emitter.emit('next');
    };//}}}

    return each_complete_callback;

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
                cnt--;
                console.log('fifo task not processing cnt is ' + cnt);
                if (cnt === 0) {
                    callback();
                }
            }
        }
    }
    killed = function () {
        console.log('fifo task killed');
        cnt--;
        if (cnt === 0) {
            callback();
        }
    };
};//}}}

module.exports.each_complete_callback = fifo;
module.exports.kill = kill;
