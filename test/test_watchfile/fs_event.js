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
var file2 = './test/test.sqlite';
var current = file1;
var next = file2;
var watch;
console.log("Watching test.sqlite");
function do_watch(){
    fs.watchFile(file1, function(curr,prev) {
        console.log("current mtime: " +curr.mtime);
        console.log("previous mtime: "+prev.mtime);
        if (curr.mtime === prev.mtime) {
            console.log("mtime equal");
        } else {
            console.log("mtime not equal");
        }   
    });
    watch = fs.watch(file1, function(action,name) {
        console.log("action " +action);
        console.log("name "+name);
    });
}

function do_unwatch(){
    console.log('unwatch ' +current);
    fs.unwatchFile(current);
    watch.close();
}
/*
setTimeout(function(){
    fs.unwatchFile(current);
    watch.close();
}, 3000);
*/
setInterval(function(){
   console.log('looop');     
},
1000);

do_watch();
console.log('rename and unwatch original');
fs.rename(current, next, function(){
    setTimeout(function(){
        do_unwatch();
    }, 1000);
});        

/*
setInterval(function(){
    console.log('rename ' + current+ ' to ' +next);
    fs.rename(current, next, function(){
        var tmp = current;
        current = next;
        next = tmp;        
    });        
}, 1000);
*/
