require("dotenv").config();
const express = require("express");
const http = require("http"); // Add this
const { Server } = require("socket.io"); // Add this
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const server = http.createServer(app); // Create HTTP server

// Configure Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for development
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
app.use("/api/posts", postRoutes);

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("✅ New client connected:", socket.id);

  // Register anonymous user
  socket.on("register", (userId) => {
    socket.userId = userId;
    console.log(`📝 User registered: ${userId}`);
    socket.emit("registered", { success: true, userId });
  });

  // Handle new post (real-time broadcast)
  socket.on("new_post", (postData) => {
    console.log("📝 New post broadcast:", postData._id);
    socket.broadcast.emit("new_post", postData);
  });

  // Handle like update (real-time broadcast)
  socket.on("like_post", ({ postId, likes }) => {
    console.log("❤️ Like update broadcast:", postId);
    io.emit("like_updated", { postId, likes });
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("Mongo Error:", err));

// Test route
app.get("/", (req, res) => {
  res.send("API is running with Socket.io...");
});

// Server start - USE server.listen instead of app.listen
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 Socket.io enabled`);
});