#!/usr/bin/node
"use strict";
var sqlite3 = require('sqlite3').verbose(),
    dir = process.argv[2],
    argc = process.argv.length,
    sql = require('../lib/constants.js').sql,
    cmd,
    db;
console.log('open ' + dir);
if (argc === 2) {
    console.log('help');
    console.log('    show: meta <repl_dir>');
    console.log('    set volume: meta <repl_dir> set <index> <volume>');
    console.log('    set last record: meta <repl_dir> set <index> <volume> <last_record>');
}
if (argc === 3) {
    db = new sqlite3.Database(dir + 'meta.db', sqlite3.OPEN_READONLY);
    db.each("SELECT * FROM QUEUE_META order by ID asc", function (err, row) {
        if (err) {
            console.log('[meta]' + err);
            return;
        }
        var volume_file,
            volume,
            last_record;
        if (row.ID === '0') {
            volume_file = dir + 'volume_' + row.VOLUME + '.db';
            volume = new sqlite3.Database(volume_file, sqlite3.OPEN_READONLY);
            volume.get(sql.GET_LAST_RECORD_VOLUME, function (err2, row2) {
                last_record = 0;
                if (row2 !== undefined) {
                    last_record = row2.ID;
                }
                console.log('id ' + row.ID + ' volume ' + row.VOLUME + ' last record ' + last_record);
            });
            volume.close();
        } else {
            console.log('id ' + row.ID + ' volume ' + row.VOLUME + ' last record ' + row.LAST_RECORD);
        }
    });
    db.close();
}

if (argc > 3) {
    cmd = process.argv[3];
    if (cmd === 'set') {
        var index = process.argv[4];
        var volume = process.argv[5];
        var last_record = process.argv[6];
        if (last_record !== undefined) {
            console.log('set meta index ' + index + ' volume ' + volume + ' last record:' + last_record);
            db = new sqlite3.Database(dir + 'meta.db');
            db.run('update QUEUE_META set LAST_RECORD=? where ID=? and VOLUME=?', [last_record, index, volume]);
            db.close();
        } else if (volume !== undefined) {
            console.log('set meta index ' + index + ' volume ' + volume);
            db = new sqlite3.Database(dir + 'meta.db');
            db.run('update QUEUE_META set VOLUME=? where ID=?', [volume, index]);
            db.close();
        }
    }
}
