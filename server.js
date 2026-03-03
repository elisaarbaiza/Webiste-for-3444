const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Allow Socket.IO connections from your Amplify site
const io = new Server(server, {
  cors: {
    origin: 'https://main.d3b9nx7tb3jlu.amplifyapp.com',
    methods: ['GET', 'POST']
  }
});

// Serve all static files (HTML, CSS, JS, images) from this folder
app.use(express.static(__dirname));

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('chat message', (data) => {
    // Broadcast the message to everyone (including the sender)
    io.emit('chat message', {
      user: data.user,
      text: data.text
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Chat server running at http://localhost:${PORT}/message.html`);
});

