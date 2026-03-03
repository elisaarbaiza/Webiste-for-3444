const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const app = express();
const server = http.createServer(app);

// Parse JSON and form-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple in-memory "database" for demo purposes
// In a real app, replace this with a real database.
// users: [{ id, email, passwordHash, emailVerified }]
const users = [];

function isUntEmail(email) {
  const lower = String(email || '').toLowerCase().trim();
  return lower.endsWith('@my.unt.edu') || lower.endsWith('@unt.edu');
}

// Session middleware to track logged-in users
app.use(
  session({
    secret: 'change-this-secret',
    resave: false,
    saveUninitialized: false,
  })
);

// Allow Socket.IO connections from any origin (Amplify, Render, localhost)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory conversation store (per pair of users)
// NOTE: This is not permanent storage; data is lost if the server restarts.
// conversations: Map<conversationId, { id, participants: [userA, userB], messages: [{ sender, text, createdAt }] }>
const conversations = new Map();

function getConversationId(userA, userB) {
  const a = String(userA || '').trim().toLowerCase();
  const b = String(userB || '').trim().toLowerCase();
  if (!a || !b) return null;
  const sorted = [a, b].sort();
  return `${sorted[0]}::${sorted[1]}`;
}

function ensureConversation(currentUser, otherUser) {
  const id = getConversationId(currentUser, otherUser);
  if (!id) return null;
  if (!conversations.has(id)) {
    conversations.set(id, {
      id,
      participants: [currentUser, otherUser],
      messages: []
    });
  }
  return conversations.get(id);
}

// Authentication helpers
function requireLogin(req, res, next) {
  const user = users.find((u) => u.id === req.session.userId);
  if (!user || !user.emailVerified) {
    return res.status(401).json({
      error: 'Login with a verified UNT email is required for this action.',
    });
  }
  req.user = user;
  next();
}

// Sign up with UNT email
app.post('/signup', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  if (!isUntEmail(email)) {
    return res
      .status(400)
      .json({ error: 'You must use a UNT email (@my.unt.edu or @unt.edu).' });
  }

  const existing = users.find(
    (u) => u.email.toLowerCase().trim() === email.toLowerCase().trim()
  );

  if (existing) {
    return res.status(400).json({ error: 'This email is already registered.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = {
    id: users.length + 1,
    email: email.trim(),
    passwordHash,
    // For a real app, this should stay false until they click
    // a link from a real email. For demo purposes we auto-verify.
    emailVerified: true,
  };

  users.push(newUser);

  res.json({
    message: 'Signup successful. UNT email accepted.',
    emailVerified: newUser.emailVerified,
  });
});

// Log in with UNT email
app.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = users.find(
    (u) => u.email.toLowerCase().trim() === email.toLowerCase().trim()
  );

  if (!user) {
    return res.status(400).json({ error: 'Invalid email or password.' });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(400).json({ error: 'Invalid email or password.' });
  }

  if (!user.emailVerified) {
    return res
      .status(403)
      .json({ error: 'Please verify your UNT email before logging in.' });
  }

  req.session.userId = user.id;

  res.json({
    message: 'Logged in successfully.',
    email: user.email,
  });
});

// Log out
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out.' });
  });
});

// Example protected route (for future sell/buy/chat actions)
app.post('/protected-example', requireLogin, (req, res) => {
  res.json({ message: `Hello, ${req.user.email}. You are authenticated.` });
});

// Serve all static files (HTML, CSS, JS, images) from this folder
app.use(express.static(__dirname));

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join conversation', (payload) => {
    const { currentUser, otherUser } = payload || {};
    const convo = ensureConversation(currentUser, otherUser);
    if (!convo) {
      return;
    }

    socket.join(convo.id);
    socket.data.currentUser = currentUser;
    socket.data.currentConversationId = convo.id;

    socket.emit('conversation joined', {
      conversationId: convo.id,
      otherUser,
      messages: convo.messages
    });
  });

  socket.on('chat message', (data) => {
    const { conversationId, user, text } = data || {};
    if (!conversationId || !text || !user) return;

    const convo = conversations.get(conversationId);
    if (!convo) return;

    const message = {
      sender: user,
      text,
      createdAt: new Date().toISOString()
    };

    convo.messages.push(message);

    io.to(conversationId).emit('chat message', {
      conversationId,
      user: message.sender,
      text: message.text,
      createdAt: message.createdAt
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Chat server running on port ${PORT}`);
});

