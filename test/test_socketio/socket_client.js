var io = require('socket.io-client'),
    socket = io.connect('localhost', { port: 9090});
socket.on('connect', function () {
    console.log("socket connected"); 
    console.log('emit message user:me msg:whazzzup');
    socket.emit('private message', {user: 'me', msg:'whazzzup?'}, function(msg){
        console.log('return ' + msg); 
    });
});

