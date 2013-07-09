repl_queue
==========
use node.js to monitor sqlite and trigger consummer to consume msg

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
        CONTENT_TYPE TEXT,
        USER_ID TEXT,
        DATA TEXT,
        CREATED INTEGER
    )

### sqlite schema metta.db
    create table if not exists QUEUE_META (
        ID text PRIMARY KEY,
        VOLUME int,
        LAST_RECORD int
    )

### insert process
    step1: update volume_attr cnt=cnt+1 where volume=:volume and cnt<=:max  and status='read_write'
    step2: if update_cnt != 1 then
               if get volume lock
                   if  volume_attr.status == 'read_write' && volume_attr.cnt == :max
                       update volume_attr.status = 'read_only'
                       update meta.volume = last_volume + 1 , last_record=0
                       create new volume file
                       insert new volume_attr  
                       set to read only file. 
                       unlock
                   call step1
           insert volume  
           update meta  last_record = last_record +1, volume
                 
