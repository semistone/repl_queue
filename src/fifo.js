var sql = require('./sql.js'),
    emitter = require('events').EventEmitter,
    sqlite3 = require('sqlite3').verbose();
var DELIMITER = '/';

/**
 * Fifo consume
 * @args working_queue Array
 * @args consume_task  Function
 *
 * @return each_complete_callback
 */
var fifo = function(working_queue, config, finish_callback){
    var consume_task = config.consume_msg_callback,
        volume_file = config.path + DELIMITER + config.file;
    var db = new sqlite3.cached.Database(volume_file);
    var queue_size = 0,
        update_cnt = 0;

    /**
     * call when task finish and update meta finish
     *
     */
    var update_meta_finish = function(){
        console.log('update meta finish');
        update_cnt--;
        if (update_cnt == 0) {
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
        console.log('size is ' + rows);
        queue_size = update_cnt = rows;
        if (rows == 0) { // check empty result.
            console.log('empty rows');
            finish_callback(rows);
            return;
        }
        var sequence_task = function() {
            console.log('next task size ' + working_queue.length);
            if (working_queue.length == 0) { // all task done
                return;
            }
            var row = working_queue.shift();
            console.log('consume row ' + row.ID);
            var retry = 0;
            consume_task(row, function(consume_status){ // do consume
                if (consume_status) {
                    console.log('consume success');
                    retry = 0; // reset retry
                    db.serialize(function() {
                        db.run(sql.UPDATE_META_SQL, [row.ID, config.index], function(){
                            if (update_meta_finish()){ // has next
                                event_emitter.emit('next');
                            }
                        });
                    });
                }else{
                    console.log('consume false');
                    retry++;
                    if (retry > 3) {
                        throw new Exception('retry to many times');
                    }
                    // to do must sleep interval
                    consume_task(row, arguments.callee); // callee = function(consume_status) itself
                }
            });
        };
        event_emitter.on('next', sequence_task);
        sequence_task(); 
    };

    return each_complete_callback;

};

module.exports = fifo;
