const express = require("express");
const router = express.Router();
const ChatRoom = require("../models/ChatRoom");
const User = require("../models/User");

// GET USER'S CHAT ROOMS (with last message and participant names)
router.get("/rooms/:userId", async (req, res) => {
  try {
    console.log(`📱 Fetching rooms for user: ${req.params.userId}`);
    
    const rooms = await ChatRoom.find({
      "participants.userId": req.params.userId,
    }).sort({ updatedAt: -1 });

    const formattedRooms = await Promise.all(rooms.map(async (room) => {
      // Get fresh participant names from database
      const participantsWithNames = await Promise.all(
        room.participants.map(async (p) => {
          try {
            const user = await User.findById(p.userId);
            return {
              userId: p.userId,
              name: user?.anonymousName || p.userName || "Anonymous",
              userName: user?.anonymousName || p.userName || "Anonymous",
            };
          } catch (err) {
            return {
              userId: p.userId,
              name: p.userName || "Anonymous",
              userName: p.userName || "Anonymous",
            };
          }
        })
      );
      
      const lastMessage = room.messages[room.messages.length - 1];
      const unreadCount = room.messages.filter(
        m => m.senderId !== req.params.userId && !m.readBy.includes(req.params.userId)
      ).length;
      
      return {
        roomId: room.roomId,
        participants: participantsWithNames,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          senderId: lastMessage.senderId,
          createdAt: lastMessage.createdAt,
        } : null,
        unreadCount,
        updatedAt: room.updatedAt,
      };
    }));
    
    console.log(`✅ Found ${formattedRooms.length} rooms`);
    res.json(formattedRooms);
  } catch (error) {
    console.error("Error fetching user rooms:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET CHAT HISTORY
router.get("/history/:roomId", async (req, res) => {
  try {
    const room = await ChatRoom.findOne({ roomId: req.params.roomId });
    res.json(room?.messages || []);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: error.message });
  }
});

// CREATE OR GET CHAT ROOM
router.post("/room", async (req, res) => {
  try {
    const { userId1, userId2, userName1, userName2 } = req.body;
    const roomId = [userId1, userId2].sort().join("-");
    
    console.log(`🔍 Creating/finding room: ${roomId}`);
    
    let room = await ChatRoom.findOne({ roomId });
    
    if (!room) {
      // Get real names from database
      let name1 = userName1;
      let name2 = userName2;
      
      try {
        const user1 = await User.findById(userId1);
        const user2 = await User.findById(userId2);
        if (user1) name1 = user1.anonymousName;
        if (user2) name2 = user2.anonymousName;
      } catch (err) {
        console.warn("User lookup failed:", err.message);
      }
      
      room = new ChatRoom({
        roomId,
        participants: [
          { userId: userId1, userName: name1 || "Anonymous", joinedAt: new Date() },
          { userId: userId2, userName: name2 || "Anonymous", joinedAt: new Date() },
        ],
        messages: [],
      });
      await room.save();
      console.log(`🏠 New room created: ${roomId} (${name1} ↔ ${name2})`);
    }
    
    res.json(room);
  } catch (error) {
    console.error("Error creating chat room:", error);
    res.status(500).json({ error: error.message });
  }
});

// SEND MESSAGE
router.post("/message", async (req, res) => {
  try {
    const { roomId, message, senderId, senderName } = req.body;
    
    const newMessage = {
      content: message,
      senderId,
      senderName: senderName || "Anonymous",
      readBy: [senderId],
      createdAt: new Date(),
    };
    
    const room = await ChatRoom.findOneAndUpdate(
      { roomId },
      {
        $push: { messages: newMessage },
        $set: { updatedAt: new Date() },
      },
      { new: true }
    );
    
    const savedMessage = room.messages[room.messages.length - 1];
    
    const io = req.app.get("io");
    io.to(roomId).emit("new_message", {
      ...newMessage,
      _id: savedMessage._id.toString(),
    });
    io.emit("chat_updated", { roomId });
    
    res.json({ ...newMessage, _id: savedMessage._id.toString() });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;