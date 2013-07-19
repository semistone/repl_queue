var sql = require('./sql.js'),
    emitter = require('events').EventEmitter,
    sqlite3 = require('sqlite3').verbose();
var DELIMITER = '/';
var killed = false;
var fifos = {}

/**
 * Fifo consume constructor.
 * @args working_queue Array
 * @args config Object
 *
 * @return each_complete_callback
 */
var fifo = function(working_queue, config, index, finish_callback){//{{{
    var self = this;
    this.processing = false;
    fifos[index] = this;

    console.log('index is ' + index);
    var reader_setting = config.reader[index].consumer_function;
    if (reader_setting == undefined) {
        throw new Error('consumer_function is undefined');
    }
    var reader = new reader_setting[0](reader_setting[1]);
    var meta = new sqlite3.cached.Database(config.path + DELIMITER + 'meta.db'),
        queue_size = 0,
        remain_cnt = 0;

    
    /**
     * db.each(select)'s callback function
     *
     */
    var each_complete_callback = function(err, rows){//{{{
        self.processing = true;
        var event_emitter = new emitter();
        console.log('select result size for ' + index + ' is ' + rows);
        queue_size = remain_cnt = rows;
        if (rows == undefined || rows == 0) { // check empty result.
            console.log('empty rows');
            finish_callback(0);
            self.processing = false;
            return;
        }
        var check_kill = function(killed){
            if (killed){
                console.log('killed signal fired');
                event_emitter.removeAllListeners();
                if (reader.kill){
                    reader.kill();
                }
                killed();
                return true;
            }else{
                return false;
            }
        };

        /**
         * serialize execute task.
         *
         */
        var sequence_task = function() {//{{{
            console.log('do sequence task, remain task size ' + working_queue.length);
            if (working_queue.length == 0) { // all task done
                return;
            }
            if(check_kill(killed)) return;
           
            var row = working_queue.shift();
            console.log('consume row ' + row.ID);
            var retry = 0;


            /**
             * consume result callback
             * if  success 
             *    update meta and emit next event
             * else 
             *    retry, if retry too many times then throw error 
             *       
             */
            var consume_result_callback = function(consume_status){ //{{{ do consume

                /**
                 * call when task finish and update meta finish
                 *
                 * @return has_next
                 */
                var update_meta_finish = function(row){//{{{
                    console.log('update meta finish id:' + row.ID);
                    remain_cnt--;
                    if (remain_cnt == 0) {
                        finish_callback(queue_size, self.rowID);    
                        self.processing = false;
                        return false;
                    }
                    return true;
                };//}}}

                if (consume_status) { // task done and success
                    console.log('consume success for id:' + row.ID);
                    self.rowID = row.ID
                    meta.run(sql.UPDATE_META_SQL, [row.ID, index], function(){
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
                    if(check_kill(killed)) return;
                    //
                    // delay call
                    //
                    setTimeout(function(){
                        reader.consumer_function(row, consume_result_callback); // self = function(consume_status) itself
                    }, 3000)
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
var kill = function(callback){//{{{
    console.log('kill fifo');
    var cnt = fifos.length;
    for(var i in fifos){
        if (!fifos[i].processing) {
            console.log('fifo task not processing');
            cnt--;
            if(cnt == 0){
                callback();
            }    
        }
    }
    killed = function(){
        console.log('fifo task killed');
        cnt--;
        if(cnt == 0){
            callback();
        }    
    };
};//}}}

module.exports.each_complete_callback = fifo;
module.exports.kill = kill;
