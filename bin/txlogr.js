#!/usr/bin/node
"use strict";
var config,
    Reader = require('../lib/reader.js'),
    argc = process.argv.length,
    index_handlers = {},
    config_file,
    argc = process.argv.length,
    index = 0;

config_file = process.argv[2];
if (argc === 2) {
    console.log('help:');
    console.log('    txlogr <config.js> <index>');
    process.exit(0);
}
console.log('load config from ' + config_file);
config = require(config_file);
if (config.reader === undefined) {
    process.exit(-1);
}
if (argc === 3) {
    console.log('init reader ');
    for (index in config.reader) {
        if (config.reader.hasOwnProperty(index)) {
            index_handlers[index] = new Reader(config, index);
        }
    }
}

if (argc === 4) {
    index = process.argv[3];
    console.log('init reader index ' + index);
    index_handlers[index] = new Reader(config, index);
}
