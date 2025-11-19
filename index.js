// index.js - Minimal SupportOps MVP (server + static frontend + socket.io)
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server);

// In-memory tickets
let tickets = [
  { id: 1, title: 'Sample ticket: internet down', status: 'new', createdAt: new Date().toISOString() }
];

app.get('/api/tickets', (req, res) => res.json(tickets));

app.post('/api/tickets', (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const ticket = { id: Date.now(), title, status: 'new', createdAt: new Date().toISOString() };
  tickets.unshift(ticket);
  io.emit('ticket:new', ticket);
  res.status(201).json(ticket);
});

io.on('connection', socket => {
  console.log('client connected:', socket.id);
  socket.emit('init', { tickets });
  socket.on('disconnect', () => console.log('client disconnected:', socket.id));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`SupportOps MVP running at http://localhost:${PORT}`));
