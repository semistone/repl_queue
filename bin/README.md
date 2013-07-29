### show meta
    txlogw <logdir>
    for example:
        cd bin
        ./meta ../test/example/

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
        ./txlogw ../test/example/config.js

### txlogr
    start txlogr to consume request
    txlogr <config.js> <index>
    for example:
        cd bin
        ./txlogr ../test/example/config.js 3 # 3 is example consumer
