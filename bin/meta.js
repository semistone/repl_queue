#!/usr/bin/node
"use strict";
var sqlite3 = require('sqlite3').verbose();
var dir = process.argv[2];
console.log('open ' + dir);
var db = new sqlite3.Database(dir + 'meta.db', sqlite3.OPEN_READONLY);
db.each("SELECT * FROM QUEUE_META", function (err, row) {
    console.log('id ' + row.ID + ' volume ' + row.VOLUME + ' last record ' + row.LAST_RECORD);
});
db.close();
