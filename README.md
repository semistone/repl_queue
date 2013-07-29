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
### receive http post request -> insert into sqlite
### receive sqlite file modify event -> start to consume 
    standard consumer 
        rely consumer 
            to remote socket
            to unix domain socket
        js addon consumer(c source) 

### sqlite schema volume_N.db
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

