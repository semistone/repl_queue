var sqlite3 = require('sqlite3').verbose(),
    fs = require('fs'),
    constants = require('./constants.js'),
    sql = constants.sql,
    VOLUME_SIZE = constants.settings.VOLUME_SIZE;

var safe_db_commit = function (db) {//{{{
    "use strict";
    if (db.tx_status === 2) {
        console.log('[db]commit');
        db.tx_status = 3;
        db.exec('COMMIT');
        db.tx_status = undefined;
    }
};//}}}
var safe_db_commit_and_begin = function (db) {//{{{
    "use strict";
    if (db.tx_status === 2) {
        console.log('[db]commit2' + db.create);
        db.exec('COMMIT');
        console.log('[db]begin transaction2');
        db.tx_status = 1;
        db.exec('BEGIN TRANSACTION', function () {
            console.log('[db]begin transaction2 finish');
            db.tx_status = 2;
        });
    }
};//}}}

var safe_db_begin = function (db) {//{{{
    "use strict";
    if (db.tx_status === undefined) {
        console.log('[db]begin transaction');
        db.tx_status = 1;
        db.exec('BEGIN TRANSACTION', function () {
            db.tx_status = 2;
        });
    }
};//}}}

var init_writer = function (callback) {//{{{
    "use strict";
    var self = this;
    this.volume_id = 0;
    this.volume_file = self.config.path + '/volume_0.db';
    if (constants.settings.FLUSH_INTERVAL > 0) {
        console.log('[db]start flush per ' + constants.settings.FLUSH_INTERVAL);
        this.flush_per_second();
    }
    /**
     * get last record and start loop message.
     *
     */
    console.log('[db]init volume');
    this.meta.get(sql.SELECT_META_SQL, [0], function (error, row) {
        var tableExists = (row !== undefined);
        if (!tableExists) {
            self.meta.serialize(function () {
                self.meta.run(sql.INSERT_META_SQL, [0, 0], function () {
                    console.log("[db]insert init writer meta done");
                });
            });
        } else {
            console.log('[db]last volume for writer is ' + row.VOLUME);
            self.volume_id = row.VOLUME;
            self.volume_file = self.config.path + '/volume_' + self.volume_id + '.db';
        }
        console.log('[db]open volume file in ' + self.volume_file);
        self.volume = new sqlite3.Database(self.volume_file);
        if (self.flush_writer_id !== undefined) {
            safe_db_begin(self.volume);
        }
        self.volume.serialize(function () {
            console.log('[db]init writer volume file');
            self.volume.run(sql.CREATE_SQL);
            self.volume.run(sql.CREATE_META_SQL);
            self.volume.get(sql.GET_LAST_RECORD_VOLUME, function (err, row) {
                if (row !== undefined) {
                    console.log('[db]init writer last record is ' + row.ID);
                    self.last_record = row.ID;
                }
            });
            self.volume.run(sql.INSERT_VOLUME_META, self.volume_id, function () {
                console.log('[db]insert volume meta');
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
        console.log('[db]rotate volume file push callback');
        return;
    }

    this.callbacks = [];
    this.callbacks.push(callback);
    console.log('[db]rotate volume file');
    self.volume.serialize(function () {
        // update and get
        self.volume.run(sql.UPDATE_VOLUME_META);
        self.volume.get(sql.GET_VOLUME_META, function (err, row) {
            var after_volume_close;
            console.log('[db]last record is ' + row.LAST_RECORD);
            after_volume_close = function () {//{{{
                fs.chmod(old_name, '444');
                self.volume_id += 1;
                new_name = self.config.path + '/volume_' + self.volume_id + '.db';
                console.log('[db]open new volume ' + new_name + ' new volume id is ' + self.volume_id);
                self.volume = new sqlite3.Database(new_name);
                if (self.flush_writer_id !== undefined) {
                    safe_db_begin(self.volume);
                }
                self.volume.serialize(function () {
                    console.log('[db]init new volume file');
                    self.volume.run(sql.CREATE_SQL);
                    self.volume.run(sql.CREATE_META_SQL);
                    self.volume.run(sql.INSERT_META_SQL, [0, self.volume_id]);
                });
                console.log('[db]update writer volume id to ' + self.volume_id);
                self.meta.run(sql.UPDATE_META_VOLUME_SQL, [self.volume_id], function () {
                    var i;
                    self.last_record = 0;
                    for (i in self.callbacks) {
                        if (self.callbacks.hasOwnProperty(i)) {
                            console.log('[db]rotate finished callback ' + i);
                            self.callbacks[i]();
                        }
                    }
                    self.callbacks = undefined;
                });
            };//}}}
            if (self.flush_writer_id !== undefined) {
                safe_db_commit(self.volume);
            }
            self.volume.close(after_volume_close);
        });
    });
};//}}}

/**
 * DB constructor
 */
var DB = function (config, callback) {//{{{
    "use strict";
    console.log('[db]new DB');
    this.config = config;
    this.meta = new sqlite3.cached.Database(config.path + '/meta.db');
    this.meta.run(sql.CREATE_META_SQL, callback);
};//}}}

var insert = function (req_id, cmd, body, callback) {//{{{
    "use strict";
    var self = this,
        insert_callback = function (err) {//{{{
            if (err) {
                console.log('[db]insert result ' + err);
                callback(err);
            } else {
                console.log('[db]insert success for cmd:' + cmd + ' result is ' + this.lastID);
                if (this.lastID >= VOLUME_SIZE) { // do rotate
                    self.rotate_writer(function () {
                        var i = 0;
                        callback();
                        for (i in self.writer_rotate_callback) {
                            if (self.writer_rotate_callback.hasOwnProperty(i)) {
                                console.log('[db]rotate callback ' + i);
                                self.writer_rotate_callback[i]();
                            }
                        }
                        self.rotating = false;
                        console.log('[db] reset rotate callback');
                        self.writer_rotate_callback = undefined;
                    });
                    return;
                }
                callback();
            }
        };//}}}
    this.cnt = this.cnt + 1;
    if (this.last_record >= VOLUME_SIZE && this.rotating) { // do rotate
        if (this.writer_rotate_callback === undefined) {
            console.log('[db] init rotate callback array');
            this.writer_rotate_callback = [];
        }
        console.log('[db] push rotate callback');
        this.writer_rotate_callback.push(function () {
            self.last_record = self.last_record + 1;
            console.log('[db] insert into volume and last id is ' + self.last_record);
            self.volume.run(sql.INSERT_VOLUME_SQL,
                [req_id, cmd, body, new Date().getTime() / 1000],
                insert_callback);
        });
    } else {
        this.last_record = this.last_record + 1;
        if (this.last_record === VOLUME_SIZE) {
            this.rotating = true;
        }
        if (this.cnt % 200 === 0) {
            console.log('[db] insert into volume and last id is ' + this.last_record);
        }
        this.volume.run(sql.INSERT_VOLUME_SQL,
            [req_id, cmd, body, new Date().getTime() / 1000],
            insert_callback);
    }

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
    //
    // flush meta per second
    //
    if (constants.settings.FLUSH_INTERVAL > 0 &&
            this.meta.flush_reader_id !== undefined) {
        safe_db_begin(this.meta);
        console.log('[db]start flush per ' + constants.settings.FLUSH_INTERVAL);
        this.meta.flush_reader_id = setInterval(function () {
            if (self.meta === undefined) {
                return;
            }
            console.log('[db]do flush');
            safe_db_commit(self.meta);
            safe_db_begin(self.meta);
            self.cnt = 0;
        }, constants.settings.FLUSH_INTERVAL);
    }
    /**
     * get last record and start loop message.
     *
     */
    this.meta.get(sql.SELECT_META_SQL, [index], function (error, row) {
        console.log('[db]get meta err: ' + error);
        var tableExists = (row !== undefined);
        if (!tableExists) {
            // todo 
            console.log('[db]copy meta from index 0 ');
            self.meta.run(sql.INSERT_LAST_META_SQL, [index], function (err) {
                console.log('[reader] insert last meta fail err:' + err);
                self.init_reader(index, callback);
            });
        } else {
            console.log('[db]last volume for index ' + index + ' is ' + row.VOLUME);
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
    console.log('[db]open volume file ' + self.volume_file);
    fs.stat(self.volume_file, function (err, stat) {
        console.log('[db]check file exist err:' + err);
        if (err) {
            setTimeout(function () {
                console.log('[db]retry');
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
    this.last_record = 0;
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
    console.log("[db]watching " + this.volume_file);
    this.watchfs = fs.watch(this.volume_file, function (action, filename) {
        callback();
    });
};//}}}

var kill = function () {//{{{
    "use strict";
    if (this.flush_writer_id !== undefined) {
        clearInterval(this.flush_writer_id);
        safe_db_commit(this.volume);
    }
    if (this.meta.flush_reader_id !== undefined) {
        clearInterval(this.flush_reader_id);
        this.meta.flush_reader_id = undefined;
        safe_db_commit(this.meta);
    }
    console.log('[db]close volme.db');
    this.volume.close();
    console.log('[db]close meta.db');
    this.meta.close();
    if (this.is_latest) {
        this.watchfs.close();
    }
};//}}}


var flush_per_second = function () {//{{{
    "use strict";
    var self = this;
    this.flush_writer_id = setInterval(function () {
        if (self.volume === undefined) {
            return;
        }
        if (self.cnt > 0) {
            console.log('[db]do flush');
            safe_db_commit_and_begin(self.volume);
            self.cnt = 0;
        }
    }, constants.settings.FLUSH_INTERVAL);
};//}}}

DB.prototype = {
    init_writer: init_writer,
    init_db:  init_db,
    cnt:  0,
    last_record: 0,
    flush_writer_id:  undefined,
    writer_rotate_callback:  undefined,
    init_reader: init_reader,
    insert: insert,
    rotate_writer: rotate_writer,
    rotate_reader: rotate_reader,
    create_volume_db: create_volume_db,
    watchfile: watchfile,
    kill: kill,
    flush_per_second: flush_per_second
};

module.exports = DB;
