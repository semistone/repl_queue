#!/usr/bin/node
"use strict";
var sqlite3 = require('sqlite3').verbose();
var dir = process.argv[2];
var volume_id = process.argv[3];
console.log('open ' + dir);
var db = new sqlite3.Database(dir + 'volume_' + volume_id + '.db', sqlite3.OPEN_READONLY);
db.each("SELECT * FROM QUEUE_VOLUME", function (err, row) {
    console.log('ID:' + row.ID);
    console.log('CMD:' + row.CMD);
    console.log('REQ:' + row.REQUEST_ID);
    console.log('DATA:\n' + row.DATA);
    console.log('CREATED:' + row.CREATED);
    console.log('===================================');
});
db.close();
