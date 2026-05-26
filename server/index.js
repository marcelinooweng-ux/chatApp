const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const Message = require('./models/Chat');

const app = express();
app.use(cors());
app.use(express.json()); // <-- CRITICAL: Allows Express to read JSON payloads from the frontend

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
});

// Setup MongoDB connection string
mongoose.connect('mongodb://127.0.0.1:27017/privateChat')
  .then(() => console.log('✓ Database Connected Successfully'))
  .catch(err => console.log('⚠️ Database connection skipped. Running real-time only.', err.message));

// ==========================================
//        AUTHENTICATION ENDPOINTS
// ==========================================

// Handle User Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check if user already exists inside our collection
    const existingUser = await mongoose.connection.db.collection('users').findOne({ username });
      
    if (existingUser) {
      return res.status(400).json({ error: 'Username signature identifier already registered.' });
    }

    // Insert new user profile document
    await mongoose.connection.db.collection('users').insertOne({
      username,
      password, // Sandbox plain text implementation. Hash with bcryptjs for production environments!
      createdAt: new Date()
    });

    res.status(201).json({ message: 'User initialization sequence complete.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Handle User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await mongoose.connection.db.collection('users').findOne({ username });
    if (!user || user.password !== password) {
      return res.status(400).json({ error: 'Invalid terminal username or keyphrase configuration.' });
    }

    res.status(200).json({ username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
//          SOCKET.IO REAL-TIME LOGIC
// ==========================================

const onlineUsers = new Map(); // tracks userId -> socket.id

io.on('connection', (socket) => {
  
  socket.on('register_user', (userId) => {
    onlineUsers.set(userId, socket.id);
  });

  socket.on('send_private_message', async (data) => {
    const { senderId, recipientId, text } = data;
    
    // Save to database asynchronously
    try {
      const dbMessage = new Message({ senderId, recipientId, text });
      await dbMessage.save();
    } catch (e) {
      console.error("Database save failed:", e.message);
    }

    // Direct deliver to recipient if online
    const targetSocketId = onlineUsers.get(recipientId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('receive_private_message', data);
    }
  });

  socket.on('disconnect', () => {
    for (let [uid, sid] of onlineUsers.entries()) {
      if (sid === socket.id) onlineUsers.delete(uid);
    }
  });
});

server.listen(5000, () => console.log('🚀 Backend engine alive on port 5000'));