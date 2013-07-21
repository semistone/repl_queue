/**
 *
 * test watch file change event
 * 
 * trigger change event:
 *     sqlite3 test.sqlite
 *     insert into x values ('test');
 */
var fs = require('fs');                                                                        
var file1 = './test.sqlite';
var file2 = './test2.sqlite';
var current = file1;
var next = file2;
console.log("Watching test.sqlite");

fs.watchFile(file1, function(curr,prev) {
    console.log("current mtime: " +curr.mtime);
    console.log("previous mtime: "+prev.mtime);
    if (curr.mtime === prev.mtime) {
        console.log("mtime equal");
    } else {
        console.log("mtime not equal");
    }   
});
fs.watch(file1, function(action,name) {
    console.log("action " +action);
    console.log("name "+name);
});
setInterval(function(){
    console.log('rename ' + current+ ' to ' +next);
    fs.rename(current, next, function(){
        var tmp = current;
        current = next;
        next = tmp;        
    });        
}, 1000);
