// index.js - Hardened SupportOps AI-Ready MVP (timeouted fetch, health check, graceful shutdown)

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server);

// In-memory tickets
let tickets = [
  {
    id: 1,
    title: 'Sample ticket: internet down',
    status: 'new',
    createdAt: new Date().toISOString(),
    priority: 'medium',
    suggestedReply: ''
  }
];

// Utility: fetch with timeout using AbortController
async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// AI using HuggingFace with timeouted requests
async function aiTriageFree(text) {
  const modelUrl = "https://api-inference.huggingface.co/models/google/flan-t5-small";
  try {
    const priorityPrompt = `Classify this support issue into one of: low, medium, high, urgent.\nIssue: ${text}`;
    const pr = await fetchWithTimeout(modelUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: priorityPrompt })
    }, 25000); // 25s timeout

    const priorityData = await pr.json();
    const rawPriority = (priorityData?.[0]?.generated_text || "medium").toLowerCase();
    const priority = ["low", "medium", "high", "urgent"].includes(rawPriority) ? rawPriority : "medium";

    const replyPrompt = `Write a short helpful support agent reply for this issue:\n"${text}"`;
    const rr = await fetchWithTimeout(modelUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: replyPrompt })
    }, 25000);

    const replyData = await rr.json();
    const suggestedReply = replyData?.[0]?.generated_text || "";

    return { priority, suggestedReply };
  } catch (err) {
    console.error("AI Error (fallback to defaults):", err?.message || err);
    return { priority: "medium", suggestedReply: "" };
  }
}

// API endpoints
app.get('/api/tickets', (req, res) => res.json(tickets));

app.post('/api/tickets', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });

    const ticket = {
      id: Date.now(),
      title,
      status: 'new',
      createdAt: new Date().toISOString(),
      priority: 'medium',
      suggestedReply: ''
    };

    // Run AI but do not let it crash the request if it fails
    const ai = await aiTriageFree(title);
    ticket.priority = ai.priority || 'medium';
    ticket.suggestedReply = ai.suggestedReply || '';

    tickets.unshift(ticket);
    io.emit('ticket:new', ticket);
    return res.status(201).json(ticket);
  } catch (err) {
    console.error("POST /api/tickets error:", err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// Simple health check for host
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

io.on('connection', socket => {
  console.log('client connected:', socket.id);
  socket.emit('init', { tickets });
  socket.on('disconnect', () => console.log('client disconnected:', socket.id));
});

// Graceful shutdown handling
let shuttingDown = false;
function gracefulShutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('Received shutdown signal, closing server...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
  // force exit after 10s
  setTimeout(() => {
    console.warn('Forcing shutdown.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Log unhandled errors for debugging
process.on('uncaughtException', (err) => {
  console.error('uncaughtException', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection', reason);
});

// Start server on Railway port binding and 0.0.0.0
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`SupportOps AI-Ready MVP running at http://localhost:${PORT}`);
});
