require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"], credentials: true },
});

app.use(cors());
app.use(express.json());
app.set("io", io);

const postRoutes = require("./src/routes/postRoutes");
const chatRoutes = require("./src/routes/chatRoutes");
const authRoutes = require("./src/routes/authRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/chat", chatRoutes);

io.on("connection", (socket) => {
  console.log("✅ New client connected:", socket.id);

  socket.on("register", (userId) => {
    socket.userId = userId;
    socket.join(`user_${userId}`);
    console.log(`📝 User registered: ${userId} (socket: ${socket.id})`);
    socket.broadcast.emit("user_online", { userId });
  });

  socket.on("join_chat", async ({ roomId, userId }) => {
    if (!roomId || roomId === "undefined") {
      console.error(`❌ join_chat called with invalid roomId: "${roomId}" by user ${userId}`);
      return;
    }
    socket.join(roomId);
    const roomSockets = await io.in(roomId).allSockets();
    console.log(`👥 User ${userId} joined room: ${roomId} (${roomSockets.size} socket(s))`);

    try {
      const ChatRoom = require("./src/models/ChatRoom");
      await ChatRoom.updateMany(
        {
          roomId,
          "messages.readBy": { $ne: userId },
          "messages.senderId": { $ne: userId },
        },
        { $addToSet: { "messages.$[].readBy": userId } }
      );
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }

    socket.to(roomId).emit("user_joined", { userId });
  });

  socket.on("send_message", async ({ roomId, message, senderId, senderName }) => {
    if (!roomId || roomId === "undefined" || !senderId || !message) {
      console.error("❌ send_message missing fields:", {
        roomId,
        senderId,
        hasMessage: !!message,
      });
      return;
    }

    console.log(`📨 send_message — room: ${roomId}, sender: ${senderId}, msg: ${message}`);

    try {
      const ChatRoom = require("./src/models/ChatRoom");

      const newMessage = {
        content: message,
        senderId,
        senderName: senderName || "Anonymous",
        readBy: [senderId],
        reactions: [],
        createdAt: new Date(),
      };

      socket.join(roomId);

      const updatedRoom = await ChatRoom.findOneAndUpdate(
        { roomId },
        {
          $push: { messages: newMessage },
          $set: { updatedAt: new Date() },
          $setOnInsert: {
            roomId,
            participants: [{ userId: senderId, userName: senderName || "Anonymous" }],
            createdAt: new Date(),
          },
        },
        {
          returnDocument: "after",
          upsert: true,
        }
      );

      const savedMessage = updatedRoom.messages[updatedRoom.messages.length - 1];
      const roomSockets = await io.in(roomId).allSockets();
      console.log(`📤 Emitting to ${roomSockets.size} socket(s) in room ${roomId}`);

      io.to(roomId).emit("new_message", {
        ...newMessage,
        _id: savedMessage._id.toString(),
      });

      io.emit("chat_updated", { roomId });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  });

  // ✅ REACTION HANDLER - Complete working version
  socket.on("react_message", async ({ roomId, messageId, emoji, userId }) => {
    console.log("🔥 Reaction received:", { roomId, messageId, emoji, userId });
    
    if (!roomId || !messageId || !emoji || !userId) {
      console.error("❌ Missing fields:", { roomId, messageId, emoji, userId });
      return;
    }

    try {
      const ChatRoom = require("./src/models/ChatRoom");
      
      socket.join(roomId);
      console.log(`📡 Socket in room ${roomId}`);

      const room = await ChatRoom.findOne({ roomId });
      if (!room) {
        console.error("❌ Room not found:", roomId);
        return;
      }

      const message = room.messages.id(messageId);
      if (!message) {
        console.error("❌ Message not found:", messageId);
        return;
      }

      if (!message.reactions) {
        message.reactions = [];
      }

      const existingIdx = message.reactions.findIndex(
        (r) => r.emoji === emoji && r.userId === userId
      );

      if (existingIdx > -1) {
        message.reactions.splice(existingIdx, 1);
        console.log(`➖ Reaction ${emoji} REMOVED`);
      } else {
        message.reactions.push({ emoji, userId });
        console.log(`➕ Reaction ${emoji} ADDED`);
      }

      // Update timestamp manually
      room.updatedAt = new Date();
      
      await room.save();
      console.log(`💾 Saved. Total reactions: ${message.reactions.length}`);

      io.to(roomId).emit("reaction_updated", {
        messageId: messageId,
        reactions: message.reactions,
      });
      console.log(`📡 Broadcasted to room ${roomId}`);

    } catch (error) {
      console.error("❌ Error handling reaction:", error);
    }
  });

  socket.on("typing", ({ roomId, userId, isTyping }) => {
    socket.to(roomId).emit("user_typing", { userId, isTyping });
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      socket.broadcast.emit("user_offline", { userId: socket.userId });
    }
    console.log("❌ Client disconnected:", socket.id, "userId:", socket.userId);
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("Mongo Error:", err));

app.get("/", (req, res) => res.send("API is running!"));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 Socket.io enabled`);
});