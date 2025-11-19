// index.js - SupportOps MVP with FREE HuggingFace AI integration (no API key required)

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const fetch = require('node-fetch'); // free API calls

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

// ----------- AI USING FREE HUGGINGFACE MODEL ------------- //
// No API key required
async function aiTriageFree(text) {
  try {
    // Priority classification
    const priorityPrompt = `Classify this support issue into one of: low, medium, high, urgent.\nIssue: ${text}`;

    const priorityRes = await fetch(
      "https://api-inference.huggingface.co/models/google/flan-t5-small",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: priorityPrompt })
      }
    );

    const priorityData = await priorityRes.json();
    const rawPriority = (priorityData[0]?.generated_text || "medium").toLowerCase();

    // clean priority to one of allowed
    const priority = ["low", "medium", "high", "urgent"].includes(rawPriority)
      ? rawPriority
      : "medium";

    // Suggested reply
    const replyPrompt = `Write a short helpful support agent reply for this issue:\n"${text}"`;

    const replyRes = await fetch(
      "https://api-inference.huggingface.co/models/google/flan-t5-small",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: replyPrompt })
      }
    );

    const replyData = await replyRes.json();
    const suggestedReply = replyData[0]?.generated_text || "";

    return { priority, suggestedReply };

  } catch (err) {
    console.error("AI Error:", err.message);
    return { priority: "medium", suggestedReply: "" };
  }
}

// --------------- API ---------------- //

app.get('/api/tickets', (req, res) => res.json(tickets));

app.post('/api/tickets', async (req, res) => {
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

  // AI (free)
  const ai = await aiTriageFree(title);
  ticket.priority = ai.priority;
  ticket.suggestedReply = ai.suggestedReply;

  tickets.unshift(ticket);
  io.emit('ticket:new', ticket);

  res.status(201).json(ticket);
});

io.on('connection', socket => {
  console.log('client connected:', socket.id);
  socket.emit('init', { tickets });
});

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`SupportOps AI-Ready MVP running at http://localhost:${PORT}`));
