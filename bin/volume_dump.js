#!/usr/bin/node
"use strict";
var sqlite3 = require('sqlite3').verbose();
var sql = require('../lib/constants.js').sql;
var dir = process.argv[2];
var volume_id = process.argv[3];
console.log('open ' + dir);
var db = new sqlite3.Database(dir + 'volume_' + volume_id + '.db', sqlite3.OPEN_READONLY);
var dump_binary = function () {//{{{
    console.log('dump binary use base64');
    db.each("SELECT * FROM QUEUE_VOLUME", function (err, row) {
        console.log('ID:' + row.ID);
        console.log('CMD:' + row.CMD);
        console.log('REQ:' + row.REQUEST_ID);
        console.log('DATA:' + row.DATA.length);
        console.log('DATA:\n' + new Buffer(row.DATA).toString('base64'));
        console.log('CREATED:' + row.CREATED);
        console.log('===================================');
    });
    db.close();
};//}}}

var dump_text = function () {//{{{
    console.log('dump text data');
    db.each("SELECT * FROM QUEUE_VOLUME", function (err, row) {
        console.log('ID:' + row.ID);
        console.log('CMD:' + row.CMD);
        console.log('REQ:' + row.REQUEST_ID);
        console.log('DATA:\n' + row.DATA);
        console.log('CREATED:' + row.CREATED);
        console.log('===================================');
    });
    db.close();
};//}}}

(function () {//{{{
    db.each(sql.SHOW_TABLE_INFO, function (err, row) {
        if (row.name === 'DATA') {
            if (row.type === 'TEXT') {
                dump_text();
            } else {
                dump_binary();
            }
        }
    });
}());//}}}
