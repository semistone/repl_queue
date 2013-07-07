var  sql = require('./sql.js');
/**
 * Fifo consume
 * @args working_queue Array
 * @args consume_task  Function
 *
 * @return each_complete_callback
 */
function filo(working_queue, consume_task, finish_callback, db){
    /**
     * call when sqlite each loop finish.
     *
     */
    var queue_size;
    var update_cnt = 0;
    var update_meta_finish = function(){
        console.log('update meta finish');
        update_cnt--;
        if (complete && update_cnt == 0) {
            finish_callback(last_update_rows);    
        }
    };
    var each_complete_callback = function(err, rows){
        var event_emitter = new emitter();
        update_cnt = rows;
        var sequence_task = function() {
            console.log('next task size ' + working_queue.length);
            if (working_queue.length == 0) { // all task done
                task_complete_callback(queue_size);
                return;
            }
            var row = working_queue.shift();
            console.log('consume row ' + row.ID);
            var retry = 0;
            consume_task(row, function(consume_status){ // do consume
                if (consume_status) {
                    console.log('consume success');
                    db.serialize(function() {
                        db.run(sql.UPDATE_META_SQL, [row.ID, config.index], function(){
                            update_meta_finish();
                            event_emitter.emit('next');
                        });
                    });
                }else{
                    console.log('consume false');
                    retry++;
                    if (retry > 3) {
                        throw new Exception('retry to many times');
                    }
                    consume_task(row, arguments.callee); // function(consume_status) itself
                }
            });
        };
        if (rows == 0) {
            console.log('empty rows');
            finish_callback(rows);
        }
        event_emitter.on('next', sequence_task);
        //
        //
        //
        queue_size = working_queue.length;
        console.log('size is ' + queue_size);
        sequence_task(); 
    };

    return each_complete_callback;

};

module.exports.fifo = fifo;
