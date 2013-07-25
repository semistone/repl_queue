#!/usr/bin/node
"use strict";
var sqlite3 = require('sqlite3').verbose(),
    dir = process.argv[2],
    argc = process.argv.length,
    cmd,
    db;
console.log('open ' + dir);
if (argc === 3) {
    db = new sqlite3.Database(dir + 'meta.db', sqlite3.OPEN_READONLY);
    db.each("SELECT * FROM QUEUE_META", function (err, row) {
        console.log('id ' + row.ID + ' volume ' + row.VOLUME + ' last record ' + row.LAST_RECORD);
    });
    db.close();
}

if (argc > 3) {
    cmd = process.argv[3];
    if (cmd === 'set') {
        var index = process.argv[4];
        var last_record = process.argv[5];
        console.log('set meta index ' + index + ' last record:' + last_record);
        db = new sqlite3.Database(dir + 'meta.db');
        db.run('update QUEUE_META set LAST_RECORD=? where ID=?', [last_record, index]);
        db.close();
    }
}
