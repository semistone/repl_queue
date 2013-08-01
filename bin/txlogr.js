#!/usr/bin/node
"use strict";
var config,
    Reader = require('../lib/reader.js'),
    init = require('simple-daemon'),
    argc = process.argv.length,
    index_handlers = {},
    config_file,
    argc = process.argv.length,
    index = 'all';

config_file = process.argv[3];
if (argc < 4) {
    console.log('help:');
    console.log('    txlogr start <config.js> <index>');
    console.log('    txlogr stop <config.js> <index>');
    console.log('    txlogr status <config.js> <index>');
    process.exit(0);
}
console.log('load config from ' + config_file);
config = require(config_file);
if (config.reader === undefined) {
    process.exit(-1);
}
if (argc === 4) {
    console.log('init all reader ');
}

if (argc === 5) {
    index = process.argv[4];
    console.log('init reader index ' + index);
}
init.simple({
    pidfile : config.path + '/txlogr_' + index + '.pid',
    logfile : config.path + '/txlogr_' + index + '.log',
    command : process.argv[2],
    runSync : function () {
        var tmp_index;
        if (index === 'all') {
            for (tmp_index in config.reader) {
                if (config.reader.hasOwnProperty(tmp_index)) {
                    index_handlers[tmp_index] = new Reader(config, tmp_index);
                }
            }
        } else {
            index_handlers[index] = new Reader(config, index);
        }
    }
});
