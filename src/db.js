var sqlite3 = require('sqlite3').verbose(),
    sql = require('./sql.js');
    fs = require('fs'),
    VOLUME_SIZE = 30;

var init_volume = function(callback){//{{{
    this.volume_id = 0;
    var self = this;
    /**
     * get last record and start loop message.
     *
     */
    console.log('init volume');
    this.meta.get(sql.SELECT_META_SQL, [0],function(error, row) {
        tableExists = (row != undefined);
        if (!tableExists) {
            self.meta.serialize(function(){
                self.meta.run(sql.INSERT_META_SQL, [0, 0], function(){
                    console.log("insert writer meta done");
                });
            });
        } else {
            console.log('last volume for writer is ' + row.VOLUME);
            self.volume_id = row.VOLUME;
        }
        console.log('open volume file in ' + self.config.path + '/volume.db');
        self.volume = new sqlite3.Database(self.config.path + '/volume.db')
        self.volume.serialize(function(){
            console.log('init writer volume file');
            self.volume.run(sql.CREATE_SQL);
            self.volume.run(sql.CREATE_META_SQL);
            self.volume.run(sql.INSERT_VOLUME_META, self.volume_id, function(){
                callback(self.volume_id, self.volume);
            });
        });
    });

};//}}}

/**
 * rotate file
 *
 */    
var rotate = function(callback){//{{{
    var self = this;
    if(this.callbacks != undefined){// prevent concurrent 
        this.callbacks.push(callback);
        console.log('rotate volume file push callback');
        return;
    } else {
        this.callbacks = [];
        this.callbacks.push(callback);
    }
    console.log('rotate volume file');
    var old_name = this.config.path + '/volume.db';
    var new_name = this.config.path + '/volume_' + this.volume_id + '.db';
    this.volume.run(sql.UPDATE_VOLUME_META, function(){
        fs.chmod(new_name, '444');
        self.volume.close();
        fs.renameSync(old_name, new_name);
        self.volume_id += 1;
        console.log('open new volume ' + old_name + ' new volume id is ' + self.volume_id);
        self.volume = new sqlite3.Database(old_name);
        self.volume.serialize(function(){
            console.log('init new volume file');
            self.volume.run(sql.CREATE_SQL);
            self.volume.run(sql.CREATE_META_SQL);
            self.volume.run(sql.INSERT_META_SQL, [0, self.volume_id]);
        });
        console.log('update writer volume id to ' + self.volume_id);
        self.meta.run(sql.UPDATE_META_VOLUME_SQL, [self.volume_id], function(){
            for(var i in this.callbacks){
                self.callbacks[i](self.volume_id, self.volume);
            }            
            self.callbacks = [];
        });
    });
};//}}}

var constructor = function(config){//{{{
    this.config = config;
    this.meta = new sqlite3.cached.Database(config.path + '/meta.db');
    this.meta.run(sql.CREATE_META_SQL);
}//}}}

var insert = function(req_id, cmd, body, callback){//{{{
    var self = this;
    var insert_callback = function(err){
        if (err){
            console.log('insert result ' + err);
            callback(err);
        } else {
            console.log('insert success for cmd:' + cmd + ' result is ' + this.lastID);
            if(this.lastID > VOLUME_SIZE) { // do rotate
                self.rotate(function(_volume_id, _volume){
                    self.volume = _volume; 
                    callback();
                });
                return;
            } else{
                callback();
            }
        }
    };
    this.volume.run(sql.INSERT_VOLUME_SQL,
        [req_id, cmd, body, new Date().getTime()/1000],
        insert_callback);

};//}}}

/**
 * init tables 
 */
var init_db = function(){//{{{
    this.volume.run(sql.CREATE_SQL);
    this.volume.run(sql.CREATE_META_SQL);
    this.meta.run(sql.CREATE_META_SQL);
};//}}}

var init_reader = function(index, callback){//{{{
     var self = this;
    /**
     * get last record and start loop message.
     *
     */
    this.meta.get(sql.SELECT_META_SQL, [index],function(error, row) {
        console.log('get meta');
        tableExists = (row != undefined);
        if (!tableExists) {
            // todo 
            console.log('copy meta from index 0 ');
            self.meta.run(sql.INSERT_LAST_META_SQL, [index], function(err){
                console.log(err);
                self.init_reader(index, callback);         
            }); 
        } else {
            console.log('last record for ' + index +' is ' + row.VOLUME);
            self.volume_id =  row.VOLUME;
            self.volume_file = self.config.path + '/volume_'+ self.volume_id + '.db';
            self.is_latest = false;
            fs.stat(self.volume_file, function(err, stat){
                console.log('check file exist ' + err);
                if(err){
                    self.volume_file = self.config.path + '/volume.db';
                    self.is_latest = true;
                }
                console.log('open volume file ' + self.volume_file);
                self.volume = new sqlite3.Database(self.volume_file);
                callback();
            });
        }
    });

};//}}}

constructor.prototype = {
    init_volume: init_volume,
    init_db:  init_db,
    init_reader: init_reader,
    insert: insert,
    rotate: rotate 
};

module.exports = constructor;
