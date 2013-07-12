var http = require('http'),
    socket = require('socket.io'),
    app = http.createServer().listen(9090);

var io = socket.listen(app);
io.sockets.on('connection', function (socket) {
    console.log('socket connected');
    socket.on('private message', function(user, fn){
        console.log('user:'+user.me + ' msg:' + user.msg);
        fn('ok');
    });
    socket.on('disconnect', function(){
        console.log('disconnect');
    });
});
