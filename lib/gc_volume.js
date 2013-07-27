var sqlite3 = require('sqlite3').verbose(),
    constants = require('./constants.js'),
    sql = constants.sql,
    fs = require('fs'),
    DB = require('./db.js');

var do_delete = function (path, max_volume) {//{{{
    "use strict";
    var del_fun;
    del_fun = function (i) {//{{{
        var volume_file = path + '/volume_' + i + '.db';
        console.log('[gc]delete ' + volume_file);
        fs.lstat(volume_file, function (err, stat) {
            if (err) {
                //console.log('[gc]delete file ' + volume_file + ' err ' + err);
                return;
            }
            if (stat.isFile()) {
                fs.unlink(volume_file, function (err) {
                    if (err) {
                        console.log('[gc]' + err);
                        return;
                    }
                    i = i - 1;
                    if (i < 0) {
                        return;
                    }
                    del_fun(i);
                });
            } else {
                console.log('[gc]' + volume_file + ' not file');
            }
        });
    };//}}}
    del_fun(max_volume - 1);
};//|}}}
var GC = function (config) {//{{{
    "use strict";
    this.path = config.path;
    this.max_volumes = config.max_volumes;
    this.meta = new sqlite3.cached.Database(config.path + '/meta.db', sqlite3.OPEN_READONLY);
};//}}}
var start = function () {//{{{
    "use strict";
    console.log('[gc]start gc cron task');
    var self = this;
    this.gc_id = setInterval(function () {
        self.exec();
    }, constants.settings.GC_VOLUME_INTERVAL);
};//}}}

var kill = function () {//{{{
    "use strict";
    clearInterval(this.gc_id);
    //this.meta.close();
};//}}}

var exec = function () {//{{{
    "use strict";
    var max_volume,
        self = this;
    this.meta.get(sql.GET_MIN_VOLUME, function (err, row) {
        if (row === undefined) {
            console.log('no reader');
            return;
        }
        console.log('[gc]min is volume is ' + row.VOLUME);
        max_volume = row.VOLUME - self.max_volumes;
        if (max_volume < 0) {
            console.log('[gc]no need to delete volumes ' + max_volume);
        }
        console.log('[gc]delete volume id < ' + max_volume);
        do_delete(self.path, max_volume);
    });
};//}}}

(function () {
    "use strict";
    GC.prototype = {
        exec: exec,
        kill: kill,
        start: start
    };
}());
module.exports = GC;
