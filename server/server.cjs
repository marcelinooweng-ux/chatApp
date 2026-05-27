const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
// 1. INITIALIZE MIDDLEWARE FIRST - Completely open CORS configuration
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(bodyParser.json());

const server = http.createServer(app);

// Configure Socket.io with explicit fallback matching settings
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"] // Allow fallback configurations if proxies drop websocket lines
});

// 2. DATABASE CONNECTION
const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/demonSlayerDB';
mongoose.connect(mongoURI)
  .then(() => console.log('Connected to Database'))
  .catch(err => console.error('Connection error', err));

// Inside your Mongoose User Schema definition:
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  friends: { type: Array, default: [] },
  friendRequests: { type: Array, default: [] },
  
  // 🧼 Add this field to track individual clearance timelines
  chatClearTimestamps: { type: Map, of: Date, default: {} } 
});
const User = mongoose.model('User', userSchema);

// ==========================================
// 🛡️ UNIFIED PERSISTENT MESSAGE SCHEMA (FIXED)
// ==========================================
const messageSchema = new mongoose.Schema({
    room: { type: String, required: true },
    user: { type: String, required: true },
    message: { type: String, required: true }
}, { timestamps: true }); // 👈 ADD THIS HERE! This automatically manages accurate "createdAt" and "updatedAt" fields.

// Ensure you delete any old compilation models if they conflict
if (mongoose.models.Message) {
  delete mongoose.models.Message;
}
const Message = mongoose.model('Message', messageSchema);
// 3. API ROUTES
app.get('/', (req, res) => res.send('API is active.'));

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await new User({ username, password: hashedPassword }).save();
        res.status(201).json({ message: 'Registration successful' });
    } catch (err) {
        res.status(400).json({ error: 'Slayer already exists.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
        res.status(200).json({ username: user.username });
    } else {
        res.status(401).json({ error: 'Invalid credentials.' });
    }
});

app.get('/api/users/search/:username', async (req, res) => {
    const user = await User.findOne({ username: req.params.username }, 'username');
    user ? res.json(user) : res.status(404).json({ error: "Slayer not found" });
});

// Send a friend request (Updated to prevent sending duplicate requests or adding yourself)
app.post('/api/friends/request', async (req, res) => {
    try {
        const { fromUser, toUser } = req.body;
        
        if (fromUser === toUser) {
            return res.status(400).json({ error: "You cannot add yourself." });
        }

        const targetUser = await User.findOne({ username: toUser });
        if (!targetUser) {
            return res.status(404).json({ error: "Slayer not found." });
        }

        // Check if already friends or request already exists
        if (targetUser.friendRequests.includes(fromUser) || targetUser.friends.includes(fromUser)) {
            return res.status(400).json({ error: "Oath request already pending or active." });
        }

        await User.updateOne({ username: toUser }, { $push: { friendRequests: fromUser } });
        res.status(200).json({ message: "Oath request sent successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Server error during request processing." });
    }
});

// GET Pending Friend Requests for a logged-in user
app.get('/api/friends/requests', async (req, res) => {
    try {
        const username = req.headers['username'];
        const user = await User.findOne({ username });
        res.json(user ? user.friendRequests : []);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch friend requests." });
    }
});
// ==========================================
// 🤝 ACCEPT FRIEND REQUEST ENDPOINT
// ==========================================
app.post('/api/friends/accept', async (req, res) => {
  try {
    const { username, fromUser } = req.body;

    if (!username || !fromUser) {
      return res.status(400).json({ error: "Missing username or fromUser in body" });
    }

    // 1. Find both users in MongoDB
    const user = await User.findOne({ username });
    const sender = await User.findOne({ username: fromUser });

    if (!user || !sender) {
      return res.status(404).json({ error: "One of the slayers was not found" });
    }

    // 2. Remove from pending requests array
    user.friendRequests = user.friendRequests.filter(name => name !== fromUser);

    // 3. Prevent duplicate friend additions before pushing
    if (!user.friends.includes(fromUser)) {
      user.friends.push(fromUser);
    }
    if (!sender.friends.includes(username)) {
      sender.friends.push(username);
    }

    // 4. Save both modified documents back to MongoDB
    await user.save();
    await sender.save();

    res.status(200).json({ message: "Alliance successfully forged!" });
  } catch (err) {
    console.error("Error accepting request:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
// ==========================================
// ❌ UNIFIED REJECT FRIEND REQUEST ENDPOINT
// ==========================================
app.post('/api/friends/reject', async (req, res) => {
  try {
    const { username, fromUser } = req.body;

    if (!username || !fromUser) {
      return res.status(400).json({ error: "Missing username or fromUser" });
    }

    // Safely pull the request out of the document array
    await User.updateOne(
      { username: username }, 
      { $pull: { friendRequests: fromUser } }
    );

    res.status(200).json({ message: "Oath request safely rejected." });
  } catch (err) {
    console.error("Error rejecting request:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get('/api/friends', async (req, res) => {
    try {
        const username = req.headers['username'];
        const user = await User.findOne({ username }).populate('friends', 'username');
        res.json(user ? user.friends : []);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch friends" });
    }
});

// === 🆕 NEW: ROUTE TO LOAD CHAT HISTORY ===
app.get('/api/messages/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const username = req.headers.username; // Ensure you pass username in headers from frontend fetch!

    if (!username) {
      return res.status(400).json({ error: "Missing username header to filter history." });
    }

    // 1. Fetch the user profile to look up their clearance record
    const user = await User.findOne({ username });
    const userClearDate = user?.chatClearTimestamps?.get(roomId);

    // 2. Query the DB for messages in this room
    let query = { room: roomId };
    
    // If this user has cleared the chat before, only pull messages sent AFTER their last wipe
    if (userClearDate) {
      query.createdAt = { $gt: userClearDate }; 
    }

    // Find and return messages (make sure your Message schema records timestamps via { timestamps: true })
    const history = await Message.find(query).sort({ createdAt: 1 });
    res.json(history);
  } catch (err) {
    console.error("Error fetching filtered logs:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
// 🛡️ Add this route to your server.cjs / backend routes file
app.get('/api/friends/pending', async (req, res) => {
  try {
    const { username } = req.headers;
    if (!username) return res.status(400).json({ error: "Missing username header" });

    // Look up the user receiving the requests
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "Slayer not found" });

    // Return their raw friendRequests array from MongoDB
    res.json(user.friendRequests || []);
  } catch (err) {
    console.error("Error fetching pending scrolls:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
// ==========================================
// 💔 REMOVE / UNFRIEND ALLIANCE ENDPOINT
// ==========================================
app.post('/api/friends/remove', async (req, res) => {
  try {
    const { username, friendName } = req.body;

    if (!username || !friendName) {
      return res.status(400).json({ error: "Missing username or friendName in body" });
    }

    // 1. Locate both users in MongoDB
    const user = await User.findOne({ username });
    const exFriend = await User.findOne({ username: friendName });

    if (!user || !exFriend) {
      return res.status(404).json({ error: "Slayer not found" });
    }

    // 2. Filter out each other from their respective friends arrays
    user.friends = user.friends.filter(name => name !== friendName);
    exFriend.friends = exFriend.friends.filter(name => name !== username);

    // 3. Save modifications back to MongoDB
    await user.save();
    await exFriend.save();

    res.status(200).json({ message: "Alliance broken successfully." });
  } catch (err) {
    console.error("Error breaking alliance:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
// ==========================================
// 🧼 DELETE CHAT HISTORY ONLY (KEEP FRIEND)
// ==========================================
app.post('/api/messages/clear', async (req, res) => {
  try {
    const { username, roomId } = req.body;

    if (!username || !roomId) {
      return res.status(400).json({ error: "Missing username or roomId in body" });
    }

    // Find the user who clicked clear
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "Slayer not found" });

    // Initialize map if it doesn't exist
    if (!user.chatClearTimestamps) {
      user.chatClearTimestamps = new Map();
    }

    // Set the clearance timestamp for this room to right now on their account only
    user.chatClearTimestamps.set(roomId, new Date());
    await user.save();

    res.status(200).json({ message: "Your side of the conversation has been cleared." });
  } catch (err) {
    console.error("Error setting one-sided clear timestamp:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==========================================
// 💔 UNFRIEND ALLIANCE (REMOVE FRIEND & DELETE CHAT)
// ==========================================
app.post('/api/friends/remove', async (req, res) => {
  try {
    const { username, friendName } = req.body;

    if (!username || !friendName) {
      return res.status(400).json({ error: "Missing username or friendName" });
    }

    // 1. Locate both users in MongoDB
    const user = await User.findOne({ username });
    const exFriend = await User.findOne({ username: friendName });

    if (!user || !exFriend) {
      return res.status(404).json({ error: "Slayer not found" });
    }

    // 2. Dissolve friendship array bonds
    user.friends = user.friends.filter(name => name !== friendName);
    exFriend.friends = exFriend.friends.filter(name => name !== username);

    await user.save();
    await exFriend.save();

    // 3. Clear all message cold history between these two specific users completely
    const roomId = [username, friendName].sort().join('-');
    await Message.deleteMany({ room: roomId });

    res.status(200).json({ message: "Alliance broken and chat logs completely purged." });
  } catch (err) {
    console.error("Error breaking alliance:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
// 4. SOCKET LOGIC
let onlineUsers = {};

io.on('connection', (socket) => {
  // ==========================================================
// 📡 UPDATED SOCKET USER REGISTRATION (AUTOMATIC ROOM JOINING)
// ==========================================================
socket.on('user_join', async (userData) => {
  socket.username = userData.username; // Bind username securely to socket instance [cite: 43]
  onlineUsers[socket.id] = { ...userData, id: socket.id }; // Track online state [cite: 38]
  
  try {
    // 1. Fetch the user's friend list directly from MongoDB to know their active rooms
    const userDoc = await User.findOne({ username: userData.username });
    if (userDoc && userDoc.friends) {
      userDoc.friends.forEach(friend => {
        const friendName = typeof friend === 'string' ? friend : (friend.username || friend.name);
        // Generate the identical sorted alphabetical room string
        const roomId = [userData.username, friendName].sort().join('-');
        
        // Force this socket into the channel immediately on login/boot
        socket.join(roomId);
        console.log(`⚡ Auto-connected ${userData.username} to real-time stream: ${roomId}`);
      });
    }
  } catch (err) {
    console.error("Failed auto-joining friend rooms on socket boot:", err);
  }

  // Notify everyone of updated user presence states
  io.emit('update_user_list', Object.values(onlineUsers)); // [cite: 38]
});
  socket.on('join_room', (room) => {
    socket.join(room);
  });

  socket.on('join_all_friend_rooms', (friendRooms) => {
    friendRooms.forEach(room => socket.join(room));
  });
// Inside your backend socket.on('send_message') or app.post('/api/messages') handler:

socket.on('send_message', async (data) => {
  const { room, user, message } = data;
  
  // 🛡️ Force alphabetical room string assembly before pushing to MongoDB
  const unifiedRoomId = room.split('-').sort().join('-');
  
  try {
    const newMessage = new Message({
      room: unifiedRoomId, // 👈 Saved cleanly as "Joshua-William" every time
      user,
      message
    });
    await newMessage.save();
    
    // Broadcast using the perfectly unified room ID channel
    io.to(unifiedRoomId).emit('receive_message', {
      room: unifiedRoomId,
      user,
      message
    });
  } catch (err) {
    console.error("Database save failed:", err);
  }
});
  socket.on('notify_chat_cleared', (data) => {
    const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.username === data.toUser);
    if (targetSocket) {
        // Direct real-time signal forcing target client viewport to wipe existing state hooks
        targetSocket.emit('chat_cleared', { roomId: data.roomId });
    }
});
  socket.on('disconnect', () => {
    delete onlineUsers[socket.id];
    io.emit('update_user_list', Object.values(onlineUsers));
  });
// Inside your io.on('connection', (socket) => { ... })

  // 1. Capture user registration and map username right onto the socket object
  socket.on('user_join', (data) => {
    socket.username = data.username; // 👈 CRITICAL: Binds the name so we can find it later
    console.log(`Slayer registered to socket channel: ${data.username}`);
  });
// Dispatch real-time alerts for incoming friend requests
socket.on('notify_friend_request', (data) => {
    const targetSocket = Array.from(io.sockets.sockets.values()).find(
        (s) => s.username === data.toUser
    );
    if (targetSocket) {
        // Send the exact trigger code your React frontend is listening for
        io.to(targetSocket.id).emit('incoming_friend_request');
    }
});

  // 3. Dispatch real-time alerts for accepted requests
  socket.on('notify_request_accepted', (data) => {
    const targetSocket = Array.from(io.sockets.sockets.values()).find(
      (s) => s.username === data.toUser
    );
    
    if (targetSocket) {
      targetSocket.emit('friend_request_accepted');
    }
  });
  // 📡 Inside your main useEffect(() => { ... }, [socket, username]) block:

socket.on("friend_removed", (data) => {
  // data will pass the name of the person who initiated the unfriend action
  const exFriendName = data?.fromUser;

  // 1. Instantly pull the person out of the local friends array state
  setFriends((prevFriends) => {
    return prevFriends.filter(f => {
      const name = typeof f === 'string' ? f : (f.username || f.name);
      return name !== exFriendName;
    });
  });

  // 2. If the user currently has this exact friend open, close the viewport immediately
  if (activeChatRef.current && activeChatRef.current.includes(exFriendName)) {
    setActiveChat(null);
    setCurrentFriend(null);
    setMessages([]); // Clear out view history array
  }

  // 3. Fallback database validation fetch to keep things perfectly synced
  fetchFriends();
});
socket.on('notify_friend_removed', (data) => {
    const targetSocket = Array.from(io.sockets.sockets.values()).find(
        s => s.username === data.toUser
    );
    
    if (targetSocket) {
        // Send a payload containing the initiator's name back to the target client
        targetSocket.emit('friend_removed', { fromUser: socket.username || data.fromUser });
    }
});
socket.on('video_call_user', (data) => {
      const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.username === data.toUser);
      if (targetSocket) {
          io.to(targetSocket.id).emit('video_call_incoming', {
              fromUser: socket.username,
              offer: data.offer
          });
      }
  });

  // User B answers User A's call
  socket.on('video_answer_call', (data) => {
      const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.username === data.toUser);
      if (targetSocket) {
          io.to(targetSocket.id).emit('video_call_accepted', {
              answer: data.answer
          });
      }
  });

  // Exchanging network connection routes (ICE Candidates)
  socket.on('video_ice_candidate', (data) => {
      const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.username === data.toUser);
      if (targetSocket) {
          io.to(targetSocket.id).emit('video_ice_candidate', {
              candidate: data.candidate
          });
      }
  });
// Hanging up or terminating the pipeline cleanly for both users
socket.on('video_hangup', (data) => {
    const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.username === data.toUser);
    if (targetSocket) {
        // Dispatches immediate teardown signal to the other user's app instance
        io.to(targetSocket.id).emit('video_peer_hungup');
    }
});
});
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running globally on port ${PORT}`);
});