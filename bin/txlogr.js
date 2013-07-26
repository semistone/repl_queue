#!/usr/bin/node
"use strict";
var config,
    Reader = require('../lib/reader.js'),
    index_handlers = {},
    config_file,
    index = 0;

config_file = process.argv[2];
console.log('load config from ' + config_file);
config = require(config_file);
if (config.reader === undefined) {
    process.exit(-1);
}
console.log('init reader ');
for (index in config.reader) {
    if (config.reader.hasOwnProperty(index)) {
        index_handlers[index] = new Reader(config, index);
    }
}
