var sqlite3 = require('sqlite3').verbose();
var file = process.argv[2];
var db = new sqlite3.Database(file);
var begin = new Date().getTime(), end;
var total = 100;
db.serialize(function() {
  db.run("CREATE TABLE if not exists lorem (info TEXT)");
  db.exec('BEGIN TRANSACTION');
  for (var i = 1; i <= total ; i++) {
      if (i == total) {
         db.run("INSERT INTO lorem VALUES (?)", [i], function(){
            end = new Date().getTime();
            console.log('total for ' + file + ' run ' + (end-begin)/1000);        
         });
      } else {
         db.run("INSERT INTO lorem VALUES (?)", [i]);
      }
      //console.log('insert');
  }
  db.exec('COMMIT');
  /* 
  db.each("SELECT rowid AS id, info FROM lorem", function(err, row) {
      console.log(row.id + ": " + row.info);
  });
  */ 
}
);

db.close();
