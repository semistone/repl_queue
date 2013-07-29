#!/usr/bin/node
"use strict";
var Writer = require('../lib/writer.js'),
    writer,
    argc = process.argv.length,
    config;
var config_file = process.argv[2];
if (argc === 2) {
    console.log('help:');
    console.log('    txlogw <config.js>');
    process.exit(0);
}
console.log('load config from ' + config_file);
config = require(config_file);
writer = new Writer(config);
