var sqlite3 = require('sqlite3').verbose(),
    sql = require('./sql.js');
    fs = require('fs');

var init_volume = function(callback){//{{{
    this.volume_id = 0;
    var self = this;
    /**
     * get last record and start loop message.
     *
     */
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
        console.log('open volume file in ' + self.config.path + '/volume_'+ self.volume_id + '.db');
        self.volume = new sqlite3.cached.Database(self.config.path + '/volume_'+ self.volume_id + '.db')
        callback(self.volume_id, self.volume);
    });

};//}}}

/**
 * rotate file
 *
 */    
var rotate = function(callback){//{{{
    console.log('rotate volume file');
    if(this.callbacks != undefined){// prevent concurrent 
        this.callbacks.push(callback);
        return;
    } else {
        this.callbacks = [];
        this.callbacks.push(callback);
    }
    fs.chmod(this.config.path + '/volume_'+ this.volume_id + '.db', '444'); // set to readonly mode.
    this.volume_id += 1;
    this.volume = new sqlite3.cached.Database(this.config.path + '/volume_'+ this.volume_id + '.db');
    this.volume.run(sql.CREATE_SQL);
    this.meta.run(sql.UPDATE_META_VOLUME_SQL, [this.volume_id], function(){
        for(var i in this.callbacks){
            this.callbacks[i](this.volume_id, this.volume);
        }            
    });
};//}}}

var constructor = function(config){//{{{
    this.config = config;
    this.meta = new sqlite3.cached.Database(config.path + '/meta.db');
    this.meta.run(sql.CREATE_META_SQL);
    this.init_volume = init_volume;
    this.init_db = init_db;
    this.init_reader = init_reader;
}//}}}

/**
 * init tables 
 */
var init_db = function(){//{{{
    this.volume.run(sql.CREATE_SQL);
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
                arguments.callee.caller.caller(index, callback);         
            }); 
        } else {
            console.log('last record for ' + index +' is ' + row.VOLUME);
            self.volume_id =  row.VOLUME;
            self.volume = new sqlite3.cached.Database(self.config.path + '/volume_'+ self.volume_id + '.db');
            callback(self.volume_id, self.volume, self.meta);
        }
    });

};//}}}

module.exports = constructor;
