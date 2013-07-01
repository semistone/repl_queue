/**
 *
 * test watch file change event
 * 
 * trigger change event:
 *     sqlite3 test.sqlite
 *     insert into x values ('test');
 */
var fs = require('fs');                                                                        

console.log("Watching test.sqlite");

fs.watchFile('./test.sqlite', function(curr,prev) {
    console.log("current mtime: " +curr.mtime);
    console.log("previous mtime: "+prev.mtime);
    if (curr.mtime == prev.mtime) {
        console.log("mtime equal");
    } else {
        console.log("mtime not equal");
    }   
});
