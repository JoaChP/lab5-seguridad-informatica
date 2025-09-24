// server.js
// npm install (ya tienes express y socket.io). No requiere más dependencias.

const path = require('path');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const validation = require('./libs/unalib');

const port = process.env.PORT || 3000;

// (Opcional pero recomendado) Content-Security-Policy para permitir imágenes y YouTube
app.use((req, res, next) => {
  // Permite: scripts de socket.io y jquery, imágenes http/https/data/mm.bing.net, iframes de YouTube y websockets
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "img-src 'self' data: http: https: mm.bing.net",
      "script-src 'self' https://cdn.socket.io https://code.jquery.com",
      "connect-src 'self' ws: wss: http: https:",
      "style-src 'self' 'unsafe-inline'",
      "frame-src https://www.youtube.com",
    ].join('; ')
  );
  next();
});

// root: presenta el HTML
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// escuchar conexiones por socket
io.on('connection', function (socket) {
  socket.on('Evento-Mensaje-Server', function (msg) {
    // Sanear y clasificar en el backend
    const safe = validation.validateMessage(msg);
    // Reemitir al resto
    io.emit('Evento-Mensaje-Server', safe);
  });
});

http.listen(port, function () {
  console.log('listening on *:' + port);
});
