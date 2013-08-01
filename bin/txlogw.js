#!/usr/bin/node
"use strict";
var Writer = require('../lib/writer.js'),
    init = require('simple-daemon'),
    writer,
    argc = process.argv.length,
    config;

if (argc !== 4) {
    console.log('help:');
    console.log('    txlogw start <config.js>');
    console.log('    txlogw stop <config.js>');
    console.log('    txlogw status <config.js>');
    process.exit(0);
}
var config_file = process.argv[3];
config = require(config_file);

init.simple({
    pidfile : config.path + '/txlogw.pid',
    logfile : config.path + '/txlogw.log',
    command : process.argv[2],
    runSync : function () {
        console.log('load config from ' + config_file);
        writer = new Writer(config);
    }
});
