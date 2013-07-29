repl_queue
==========
The idea of repl is use local queue to preserve some request needed to 
invoke to remote's api, which message allow async message pattern.
If remote is out of service or network is blocked,
then those requests will hold inside
local queue, after remote host is up and ready to serve, then the 
request will rely to remote by correct order(fifo).
It is similar concept as email queue.

### source directory
####lib
    basic libraries
####bin
    some commandline tools(see README in bin/README.md)
####test
    some testing data
####test/test_writer
     txlogw benchmark
### Log writer
    repl queue is consist by reader and writer.
    The goal of writer is very simple. 
    receive http post request then insert into sqlite.
    Because it's so simple, It could accept 1000req/sec. (commit 1's per second)
    
### Log reader
    Node.js could watch file change event by fs.watch()
    If writer sync data into db file, then it will trigger
    reader start to consume message. 
  
    standard consumer 
        rely consumer over http
            to remote socketio
            to local sqlite db

### Config example in tests/example/config.js
    config = {
        type: 'fifo',
        path: '../test/example',
        max_volumes: 5,
        server: {
            listen: 9090,
            socketio_handler_enable: true,
            rest_handler_enable: true 
        },
        reader:{
            '1':{ // index
                consumer_function: [rely_rest, 'http://localhost:9091/repl/example'],
                filter : filter_module.filter('ID', filter_module.mod_rule(2 ,0))
            },
            '2':{// index
                consumer_function: [rely_rest, 'http://localhost:9091/repl/example'],
                filter : filter_module.filter('ID', filter_module.mod_rule(2 ,1))
            },
            '3':{// index
                consumer_function: [ExampleReader, '']
            },
            '4':{
                consumer_function: [dist, '../test/test_dist'],
            }
        },
        writer: {
            acl: ip_acl('127.0.0.1')
        }
    };

### sqlite schema volume_N.db
    Why I choise sqlite to implement queue. It just because it's most easy 
    to implement. But still possible to implement by other key value storage.

    create table if not exists QUEUE_VOLUME (
        ID INTEGER PRIMARY KEY ASC,
        CMD TEXT,
        DATA TEXT,
        CREATED INTEGER
    )

### sqlite schema metta.db
    create table if not exists QUEUE_META (
        ID text PRIMARY KEY,
        VOLUME int,
        LAST_RECORD int
    )

