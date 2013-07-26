#!/usr/bin/node
"use strict";
var Writer = require('../lib/writer.js'),
    writer,
    config;
var config_file = process.argv[2];
console.log('load config from ' + config_file);
config = require(config_file);
writer = new Writer(config);
