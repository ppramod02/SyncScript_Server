const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const http = require('http');
const path = require('path');
const ACTIONS = require('./public/actions.js');
const pasteRouter = require("./paste/index.js");
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
app.use('/paste', pasteRouter);

app.use(express.static(path.join(__dirname, 'frontend/dist')));
app.route('/home').get((req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/dist', 'index.html'))
});

const server = http.createServer(app);
const io = new Server(server);
const userSocketMap = {};  // maps socket id to username

function getAllConnectedClients(roomId) {
    // returns the list of all connected clients of a particular room
    var connectedClients = [];
    const room = io.sockets.adapter.rooms.get(roomId);  // returns a Set of all socket IDs 
    if(room) {
        const socketIds = Array.from(room);
        socketIds.forEach( socketId => {
            const username = userSocketMap[socketId] || 'unknown';
            connectedClients.push({ socketId, username });
        });
    }
    return connectedClients;
}

io.on('connection', socket => {

    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id
            });
        });
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        io.in(roomId).emit(ACTIONS.CODE_SYNC, { code });
    });

    socket.on(ACTIONS.REQUEST_SYNC, ({ socketId, roomId }) => {
        console.log(socketId, ' requested the code');
    });

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });
})


server.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});