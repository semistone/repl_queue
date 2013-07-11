var sql = require('./sql.js'),
    emitter = require('events').EventEmitter,
    sqlite3 = require('sqlite3').verbose();
var DELIMITER = '/';
var killed = false;
/**
 * Fifo consume
 * @args working_queue Array
 * @args config Object
 *
 * @return each_complete_callback
 */
var fifo = function(working_queue, config, finish_callback){
    var consumer_function = config.consumer_function,
        meta = new sqlite3.cached.Database(config.path + DELIMITER + 'meta.db'),
        queue_size = 0,
        remain_cnt = 0;
    if (consumer_function == undefined) {
        throw new Error('consumer_function is undefined');
    }
    /**
     * call when task finish and update meta finish
     *
     * @return has_next
     */
    var update_meta_finish = function(row){
        console.log('update meta finish id:' + row.ID);
        remain_cnt--;
        if (remain_cnt == 0) {
            finish_callback(queue_size);    
            return false;
        }
        return true;
    };
    
    /**
     * db.each(select)'s callback function
     *
     */
    var each_complete_callback = function(err, rows){
        var event_emitter = new emitter();
        console.log('select result size is ' + rows);
        queue_size = remain_cnt = rows;
        if (rows == 0) { // check empty result.
            console.log('empty rows');
            finish_callback(rows);
            return;
        }
        /**
         * serialize execute task.
         *
         */
        var sequence_task = function() {
            console.log('do sequence task, remain task size ' + working_queue.length);
            if (working_queue.length == 0) { // all task done
                return;
            }
            if (killed){
                console.log('killed signal fired');
                event_emitter.removeAllListeners();
                killed();
                return;
            }
            var row = working_queue.shift();
            console.log('consume row ' + row.ID);
            var retry = 0;
            /**
             * consume result callback
             *
             */
            var consume_result_callback = function(consume_status){ // do consume
                var self = arguments.callee;
                if (consume_status) { // task done and success
                    console.log('consume success for id:' + row.ID);
                    meta.run(sql.UPDATE_META_SQL, [row.ID, config.index], function(){
                        if (update_meta_finish(row)){ // has next
                            event_emitter.emit('next');
                        }
                    });
                }else{ // task fail
                    console.log('consume false retry:' + retry + ' for id:' + row.ID );
                    retry++;
                    if (retry > 3) {
                        throw new Error('retry to many times');
                    }
                    //
                    // delay call
                    //
                    setTimeout(function(){
                        consumer_function(row, self); // self = function(consume_status) itself
                    }, 3000)
                }
            };
            consumer_function(row, consume_result_callback);
        };
        event_emitter.on('next', sequence_task);
        //
        // emit next event -> sequence_task -> consumer_function
        // after finish, then invoke finish_callback
        //
        event_emitter.emit('next');
    };

    return each_complete_callback;

};

var kill = function(callback){
    killed = callback;
}
module.exports.each_complete_callback = fifo;
module.exports.kill = kill;
