require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

// Configure Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

// Make io accessible to routes
app.set("io", io);

// Routes
const postRoutes = require("./src/routes/postRoutes");
const chatRoutes = require("./src/routes/chatRoutes");

app.use("/api/posts", postRoutes);
app.use("/api/chat", chatRoutes); // Add chat routes

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("✅ New client connected:", socket.id);

  // Register user
  socket.on("register", (userId) => {
    socket.userId = userId;
    socket.join(`user_${userId}`);
    console.log(`📝 User registered: ${userId}`);
    socket.broadcast.emit("user_online", { userId });
  });

  // Join chat room
  socket.on("join_chat", async ({ roomId, userId }) => {
    socket.join(roomId);
    console.log(`User ${userId} joined room: ${roomId}`);
    
    // Mark messages as read
    try {
      const ChatRoom = require("./src/models/ChatRoom");
      await ChatRoom.updateMany(
        { 
          roomId, 
          "messages.readBy": { $ne: userId },
          "messages.senderId": { $ne: userId }
        },
        { $addToSet: { "messages.$[].readBy": userId } }
      );
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
    
    socket.to(roomId).emit("user_joined", { userId });
  });

  // Send message
  socket.on("send_message", async ({ roomId, message, senderId, senderName }) => {
    try {
      const ChatRoom = require("./src/models/ChatRoom");
      
      const newMessage = {
        content: message,
        senderId,
        senderName: senderName || "Anonymous",
        readBy: [senderId],
        createdAt: new Date(),
      };
      
      // Save to database
      await ChatRoom.updateOne(
        { roomId },
        {
          $push: { messages: newMessage },
          $set: { updatedAt: new Date() },
        }
      );
      
      // Emit to everyone in room
      io.to(roomId).emit("new_message", {
        ...newMessage,
        roomId,
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  });

  // Typing indicator
  socket.on("typing", ({ roomId, userId, isTyping }) => {
    socket.to(roomId).emit("user_typing", { userId, isTyping });
  });

  // Disconnect
  socket.on("disconnect", () => {
    if (socket.userId) {
      socket.broadcast.emit("user_offline", { userId: socket.userId });
    }
    console.log("❌ Client disconnected:", socket.id);
  });
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("Mongo Error:", err));

// Test route
app.get("/", (req, res) => {
  res.send("API is running with Socket.io and Chat!");
});

// Server start
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 Socket.io enabled`);
});