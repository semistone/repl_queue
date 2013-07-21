var sqlite3 = require('sqlite3').verbose(),
    fs = require('fs'),
    constants = require('./constants.js'),
    sql = constants.sql,
    VOLUME_SIZE = constants.settings.VOLUME_SIZE;

var init_volume = function (callback) {//{{{
    "use strict";
    var self = this;
    this.volume_id = 0;
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
                    console.log("insert writer meta done");
                });
            });
        } else {
            console.log('last volume for writer is ' + row.VOLUME);
            self.volume_id = row.VOLUME;
        }
        console.log('open volume file in ' + self.config.path + '/volume.db');
        self.volume = new sqlite3.Database(self.config.path + '/volume.db');
        self.volume.serialize(function () {
            console.log('init writer volume file');
            self.volume.run(sql.CREATE_SQL);
            self.volume.run(sql.CREATE_META_SQL);
            self.volume.run(sql.INSERT_VOLUME_META, self.volume_id, function () {
                callback(self.volume_id, self.volume);
            });
        });
    });

};//}}}

/**
 * rotate file
 *
 */
var rotate = function (callback) {//{{{
    "use strict";
    var self = this;
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
                var old_name = self.config.path + '/volume.db',
                    new_name = self.config.path + '/volume_' + self.volume_id + '.db';
                fs.chmod(old_name, '444');
                fs.renameSync(old_name, new_name);
                self.volume_id += 1;
                console.log('open new volume ' + old_name + ' new volume id is ' + self.volume_id);
                self.volume = new sqlite3.Database(old_name);
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
                    self.rotate(function () {
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
            self.create_volume_db(callback);
        }
    });
};//}}}

var create_volume_db = function (callback) {//{{{
    "use strict";
    var self = this;
    this.volume_file = this.config.path + '/volume_' + this.volume_id + '.db';
    this.is_latest = false;
    fs.stat(self.volume_file, function (err, stat) {
        console.log('check file exist err:' + err);
        if (err) {
            self.volume_file = self.config.path + '/volume.db';
            self.is_latest = true;
        }
        console.log('open volume file ' + self.volume_file);
        self.volume = new sqlite3.Database(self.volume_file);
        callback();
    });
};//}}}

var rotate_reader = function (callback) {//{{{
    "use strict";
    var self = this;
    this.volume_id += 1;
    this.lastID = 0;
    console.log('rotate reader, update meta to next volume');
    this.meta.run(sql.ROTATE_READER_META, [this.volume_id, this.index], function (err) {
        if (err) {
            callback(err);
        }
        self.create_volume_db(callback);
    });
};//}}}

DB.prototype = {
    init_volume: init_volume,
    init_db:  init_db,
    init_reader: init_reader,
    insert: insert,
    rotate: rotate,
    rotate_reader: rotate_reader,
    create_volume_db: create_volume_db
};

module.exports = DB;
