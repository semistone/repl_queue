### show meta
    meta <logdir>
    for example:
        cd bin
        ./meta ../test/example/

### volume dump
    volume_dump <logdir> <volume>
    for example:
        cd bin
        ./volume_dump.js ../test/example/ 0
### set meta
    txlogw <logdir> set <index> <volume> <last_record>
    for example:
        cd bin
        ./meta ../test/example/ set 4 0 0

### txlogw
    start txlogw listen http request
    txlogw <config.js>
    for example:
        cd bin
        ./txlogw start ../test/example/config.js
        log file in ../test/example/txlogw.log
        pid file in ../test/example/txlogw.pid

### txlogr
    start txlogr to consume request
    txlogr start <config.js> <index>
    for example:
        cd bin
        ./txlogr ../test/example/config.js 3 # 3 is example consumer
        log file in ../test/example/txlogr_4.log
        pid file in ../test/example/txlogr_4.pid
