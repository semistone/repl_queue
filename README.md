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
