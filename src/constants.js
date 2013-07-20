/**
 * sql statment constants
 *
 */
var CREATE_SQL = "create table if not exists QUEUE_VOLUME (\n";
CREATE_SQL += "ID INTEGER PRIMARY KEY ASC, \n";
CREATE_SQL += " CMD TEXT,\n";
CREATE_SQL += " CONTENT_TYPE TEXT,\n";
CREATE_SQL += " REQUEST_ID TEXT,\n";
CREATE_SQL += " DATA TEXT,\n";
CREATE_SQL += " CREATED INTEGER\n";
CREATE_SQL += " )";

var CREATE_META_SQL = "create table if not exists QUEUE_META (\n";
CREATE_META_SQL += "    ID text PRIMARY KEY,\n";
CREATE_META_SQL += "    VOLUME int default 0,\n";
CREATE_META_SQL += "    LAST_RECORD int\n";
CREATE_META_SQL += ")";

var INSERT_VOLUME_SQL = "insert into QUEUE_VOLUME (REQUEST_ID, CMD, DATA, CREATED) values(?, ?, ?, ?)";
var SELECT_SQL = "select * from QUEUE_VOLUME where ID > ? order by ID asc limit 10";
var SELECT_META_SQL = "select * from QUEUE_META where ID = ?";
var INSERT_META_SQL = "insert or ignore into QUEUE_META values(?,?, 0)";
var UPDATE_META_SQL = "update QUEUE_META set LAST_RECORD=? where ID=?";
var UPDATE_META_VOLUME_SQL = "update QUEUE_META set VOLUME=? where ID=0";
var INSERT_LAST_META_SQL = "insert into QUEUE_META select ?, VOLUME, LAST_RECORD from QUEUE_META where ID='0'";
var INSERT_VOLUME_META = "insert or  ignore into QUEUE_META values (0, ?, 0)";
var UPDATE_VOLUME_META = "update QUEUE_META set LAST_RECORD=(select count(*) from QUEUE_VOLUME) where ID=0";
var CHECK_FINISH_VOLUME = "select count(*) as CNT from QUEUE_META where ID=0 and LAST_RECORD=?";
var ROTATE_READER_META = "update QUEUE_META set LAST_RECORD=0, VOLUME=? where ID=?";
var GET_VOLUME_META = "select LAST_RECORD from QUEUE_META where ID=0";
module.exports.sql = {//{{{
    CREATE_SQL: CREATE_SQL,
    CREATE_META_SQL: CREATE_META_SQL,
    SELECT_SQL: SELECT_SQL,
    SELECT_META_SQL: SELECT_META_SQL,
    INSERT_META_SQL: INSERT_META_SQL,
    UPDATE_META_SQL: UPDATE_META_SQL,
    INSERT_VOLUME_SQL: INSERT_VOLUME_SQL,
    INSERT_LAST_META_SQL: INSERT_LAST_META_SQL,
    UPDATE_META_VOLUME_SQL: UPDATE_META_VOLUME_SQL,
    INSERT_VOLUME_META: INSERT_VOLUME_META,
    UPDATE_VOLUME_META: UPDATE_VOLUME_META,
    CHECK_FINISH_VOLUME: CHECK_FINISH_VOLUME,
    ROTATE_READER_META: ROTATE_READER_META,
    GET_VOLUME_META: GET_VOLUME_META
};//}}}


module.exports.settings = {//{{{
    VOLUME_SIZE: 30,
    RETRY_INTERVAL: 3000,
    MAX_RETRY: 3
};//}}}