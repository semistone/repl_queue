var sqlite3 = require('sqlite3').verbose(),
    fs = require('fs'),
    constants = require('./constants.js'),
    sql = constants.sql,
    VOLUME_SIZE = constants.settings.VOLUME_SIZE;

var init_writer = function (callback) {//{{{
    "use strict";
    var self = this;
    this.volume_id = 0;
    this.volume_file = self.config.path + '/volume_0.db';
    /**
     * get last record and start loop message.
     *
     */
    console.log('init volume');
    this.meta.get(sql.SELECT_META_SQL, [0], function (error, row) {
        var tableExists = (row !== undefined);
        if (!tableExists) {
            self.meta.serialize(function () {
                self.meta.run(sql.INSERT_META_SQL, [0, 0], function () {
                    console.log("insert init writer meta done");
                });
            });
        } else {
            console.log('last volume for writer is ' + row.VOLUME);
            self.volume_id = row.VOLUME;
            self.volume_file = self.config.path + '/volume_' + self.volume_id + '.db';
        }
        console.log('open volume file in ' + self.volume_file);
        self.volume = new sqlite3.Database(self.volume_file);
        self.volume.serialize(function () {
            console.log('init writer volume file');
            self.volume.run(sql.CREATE_SQL);
            self.volume.run(sql.CREATE_META_SQL);
            self.volume.run(sql.INSERT_VOLUME_META, self.volume_id, function () {
                callback();
            });
        });
    });

};//}}}

/**
 * rotate file
 *
 */
var rotate_writer = function (callback) {//{{{
    "use strict";
    var self = this,
        new_name,
        old_name = self.config.path + '/volume_' + self.volume_id + '.db';
    if (this.callbacks !== undefined) {// prevent concurrent 
        this.callbacks.push(callback);
        console.log('rotate volume file push callback');
        return;
    }

    this.callbacks = [];
    this.callbacks.push(callback);
    console.log('rotate volume file');
    self.volume.serialize(function () {
        // update and get
        self.volume.run(sql.UPDATE_VOLUME_META);
        self.volume.get(sql.GET_VOLUME_META, function (err, row) {
            var after_volume_close;
            console.log('last record is ' + row.LAST_RECORD);
            after_volume_close = function () {//{{{
                fs.chmod(old_name, '444');
                self.volume_id += 1;
                new_name = self.config.path + '/volume_' + self.volume_id + '.db';
                console.log('open new volume ' + new_name + ' new volume id is ' + self.volume_id);
                self.volume = new sqlite3.Database(new_name);
                self.volume.serialize(function () {
                    console.log('init new volume file');
                    self.volume.run(sql.CREATE_SQL);
                    self.volume.run(sql.CREATE_META_SQL);
                    self.volume.run(sql.INSERT_META_SQL, [0, self.volume_id]);
                });
                console.log('update writer volume id to ' + self.volume_id);
                self.meta.run(sql.UPDATE_META_VOLUME_SQL, [self.volume_id], function () {
                    var i;
                    for (i in self.callbacks) {
                        if (self.callbacks.hasOwnProperty(i)) {
                            console.log('rotate finished callback ' + i);
                            self.callbacks[i]();
                        }
                    }
                    self.callbacks = undefined;
                });
            };//}}}
            self.volume.close(after_volume_close);
        });
    });
};//}}}

/**
 * DB constructor
 */
var DB = function (config, callback) {//{{{
    "use strict";
    console.log('new DB');
    this.config = config;
    this.meta = new sqlite3.cached.Database(config.path + '/meta.db');
    this.meta.run(sql.CREATE_META_SQL, callback);
};//}}}

var insert = function (req_id, cmd, body, callback) {//{{{
    "use strict";
    var self = this,
        insert_callback = function (err) {
            if (err) {
                console.log('insert result ' + err);
                callback(err);
            } else {
                console.log('insert success for cmd:' + cmd + ' result is ' + this.lastID);
                if (this.lastID > VOLUME_SIZE) { // do rotate
                    self.rotate_writer(function () {
                        callback();
                    });
                    return;
                }
                callback();
            }
        };
    this.volume.run(sql.INSERT_VOLUME_SQL,
        [req_id, cmd, body, new Date().getTime() / 1000],
        insert_callback);

};//}}}

/**
 * init tables 
 */
var init_db = function () {//{{{
    "use strict";
    this.volume.run(sql.CREATE_SQL);
    this.volume.run(sql.CREATE_META_SQL);
    this.meta.run(sql.CREATE_META_SQL);
};//}}}

var init_reader = function (index, callback) {//{{{
    "use strict";
    var self = this;
    this.watch_callback = callback;
    this.index = index;
    this.meta.run(sql.INSERT_META_SQL, [index, 0]);
    /**
     * get last record and start loop message.
     *
     */
    this.meta.get(sql.SELECT_META_SQL, [index], function (error, row) {
        console.log('get meta err: ' + error);
        var tableExists = (row !== undefined);
        if (!tableExists) {
            // todo 
            console.log('copy meta from index 0 ');
            self.meta.run(sql.INSERT_LAST_META_SQL, [index], function (err) {
                console.log(err);
                self.init_reader(index, callback);
            });
        } else {
            console.log('last volume for index ' + index + ' is ' + row.VOLUME);
            self.volume_id =  row.VOLUME;
            self.volume_file = self.config.path + '/volume_' + self.volume_id + '.db';
            self.is_latest = false;
            self.create_volume_db(function () {
                if (self.is_latest) { // only latest file need to watch
                    self.watchfile(callback);
                }
                callback();
            }, sqlite3.OPEN_READONLY);
        }
    });
};//}}}

var create_volume_db = function (callback, sqlite_mode) {//{{{
    "use strict";
    var self = this;
    this.volume_file = this.config.path + '/volume_' + this.volume_id + '.db';
    this.is_latest = false;
    console.log('open volume file ' + self.volume_file);
    fs.stat(self.volume_file, function (err, stat) {
        console.log('check file exist err:' + err);
        if (err) {
            setTimeout(function () {
                console.log('retry');
                self.create_volume_db(callback, sqlite_mode);
            }, constants.settings.RETRY_INTERVAL);
        } else {
            self.volume = new sqlite3.Database(self.volume_file, sqlite_mode);
            self.meta.get(sql.SELECT_META_SQL, [0], function (err, row) {
                if (row.VOLUME === self.volume_id) {
                    self.is_latest = true;
                }
                if (callback !== undefined) {
                    callback();
                }
            });
        }
    });
};//}}}

var rotate_reader = function (callback) {//{{{
    "use strict";
    var self = this;
    this.volume_id += 1;
    this.lastID = 0;
    console.log('rotate reader, update meta to next volume');
    if (this.is_latest) {
        console.log('unwatch ' + this.volume_file);
        this.watchfs.close();
    }
    this.volume.close();
    this.meta.run(sql.ROTATE_READER_META, [this.volume_id, this.index], function (err) {
        if (err) {
            callback(err);
            return;
        }
        self.create_volume_db(function () {
            if (self.is_latest) { // only latest file need to watch
                self.watchfile(self.watch_callback);
            }
            callback();
        }, sqlite3.OPEN_READONLY);
    });
};//}}}

/**
 * start watch db file
 *
 */
var watchfile = function (callback) {//{{{
    "use strict";
    console.log("watching " + this.volume_file);
    this.watchfs = fs.watch(this.volume_file, function (action, filename) {
        callback();
    });
};//}}}

var kill = function () {//{{{
    "use strict";
    console.log('close volme.db');
    this.volume.close();
    console.log('close meta.db');
    this.meta.close();
    if (this.is_latest) {
        this.watchfs.close();
    }
};//}}}

DB.prototype = {
    init_writer: init_writer,
    init_db:  init_db,
    init_reader: init_reader,
    insert: insert,
    rotate_writer: rotate_writer,
    rotate_reader: rotate_reader,
    create_volume_db: create_volume_db,
    watchfile: watchfile,
    kill: kill
};

module.exports = DB;
