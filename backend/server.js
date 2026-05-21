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
const notificationRoutes = require("./src/routes/notificationRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes); // ✅ MOVED OUTSIDE socket handler

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
      console.error(`❌ join_chat invalid roomId: "${roomId}" by ${userId}`);
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

  // ✅ FIXED: Ensures BOTH participants are saved to the room
  socket.on("send_message", async ({ roomId, message, senderId, senderName }) => {
    if (!roomId || roomId === "undefined" || !senderId || !message) {
      console.error("❌ send_message missing fields:", { roomId, senderId, hasMessage: !!message });
      return;
    }

    console.log(`📨 send_message — room: ${roomId}, sender: ${senderId}, msg: ${message}`);

    try {
      const ChatRoom = require("./src/models/ChatRoom");
      const User = require("./src/models/User");

      const newMessage = {
        content: message,
        senderId,
        senderName: senderName || "Anonymous",
        readBy: [senderId],
        reactions: [],
        createdAt: new Date(),
      };

      socket.join(roomId);

      // Find existing room or create new one with BOTH participants
      let room = await ChatRoom.findOne({ roomId });

      if (!room) {
        // Extract other user ID from roomId (roomId = sorted(userIds).join("-"))
        const userIds = roomId.split("-");
        const otherUserId = userIds.find(id => id !== senderId);
        
        // Get other user's name
        let otherUserName = "Anonymous";
        if (otherUserId) {
          try {
            const otherUser = await User.findById(otherUserId);
            if (otherUser) otherUserName = otherUser.anonymousName;
          } catch (err) {
            console.log("Could not fetch other user:", err);
          }
        }
        
        // Create room with BOTH participants
        room = new ChatRoom({
          roomId,
          participants: [
            { userId: senderId, userName: senderName || "Anonymous", joinedAt: new Date() },
            { userId: otherUserId, userName: otherUserName, joinedAt: new Date() },
          ],
          messages: [newMessage],
          updatedAt: new Date(),
        });
        await room.save();
        console.log(`🏠 Created new room with both participants: ${senderName} ↔ ${otherUserName}`);
      } else {
        // Add message to existing room
        room.messages.push(newMessage);
        room.updatedAt = new Date();
        
        // Ensure both participants have proper names
        let updated = false;
        for (const p of room.participants) {
          if (p.userId === senderId && (!p.userName || p.userName === "Anonymous")) {
            p.userName = senderName || "Anonymous";
            updated = true;
          }
        }
        if (updated) {
          await room.save();
          console.log(`📝 Updated participant names in room ${roomId}`);
        } else {
          await room.save();
        }
      }

      const savedMessage = room.messages[room.messages.length - 1];
      const roomSockets = await io.in(roomId).allSockets();
      console.log(`📤 Emitting to ${roomSockets.size} socket(s) in room ${roomId}`);

      // Send new message to chat room
      io.to(roomId).emit("new_message", {
        ...newMessage,
        _id: savedMessage._id.toString(),
      });

      // ✅ Notify BOTH participants via their personal rooms
      for (const participant of room.participants) {
        io.to(`user_${participant.userId}`).emit("chat_updated", { roomId });
        console.log(`🔔 Notified user_${participant.userId} of chat_updated`);
      }

    } catch (error) {
      console.error("Error sending message:", error);
    }
  });

  socket.on("react_message", async ({ roomId, messageId, emoji, userId }) => {
    if (!roomId || !messageId || !emoji || !userId) {
      console.error("❌ react_message missing fields:", { roomId, messageId, emoji, userId });
      return;
    }

    try {
      const ChatRoom = require("./src/models/ChatRoom");
      socket.join(roomId);

      const room = await ChatRoom.findOne({ roomId });
      if (!room) { console.error("❌ react_message: room not found:", roomId); return; }

      const message = room.messages.id(messageId);
      if (!message) { console.error("❌ react_message: message not found:", messageId); return; }

      if (!message.reactions || !Array.isArray(message.reactions)) {
        message.set("reactions", []);
      }

      const existingIdx = message.reactions.findIndex(r => r.emoji === emoji && r.userId === userId);

      if (existingIdx > -1) {
        message.reactions.splice(existingIdx, 1);
        console.log(`➖ Reaction ${emoji} removed by ${userId}`);
      } else {
        message.reactions.push({ emoji, userId });
        console.log(`➕ Reaction ${emoji} added by ${userId}`);
      }

      room.markModified("messages");
      await room.save();

      io.to(roomId).emit("reaction_updated", { messageId, reactions: message.reactions });
    } catch (error) {
      console.error("Error handling reaction:", error);
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

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("Mongo Error:", err));

app.get("/", (req, res) => res.send("API is running!"));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 Socket.io enabled`);
});