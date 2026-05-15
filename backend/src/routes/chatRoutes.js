const express = require("express");
const router = express.Router();
const ChatRoom = require("../models/ChatRoom");

router.get("/rooms/:userId", async (req, res) => {
  try {
    const rooms = await ChatRoom.find({
      "participants.userId": req.params.userId,
    }).sort({ updatedAt: -1 });

    const formattedRooms = rooms.map((room) => {
      const lastMessage = room.messages[room.messages.length - 1];
      const unreadCount = room.messages.filter(
        (m) =>
          m.senderId !== req.params.userId &&
          !m.readBy.includes(req.params.userId)
      ).length;

      return {
        roomId: room.roomId,
        participants: room.participants.map((p) => ({
          userId: p.userId,
          name: p.userName || p.name || "Anonymous",
          userName: p.userName || p.name || "Anonymous",
        })),
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              senderId: lastMessage.senderId,
              createdAt: lastMessage.createdAt,
            }
          : null,
        unreadCount,
        updatedAt: room.updatedAt,
      };
    });

    res.json(formattedRooms);
  } catch (error) {
    console.error("Error fetching user rooms:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/history/:roomId", async (req, res) => {
  try {
    const room = await ChatRoom.findOne({ roomId: req.params.roomId });
    res.json(room?.messages || []);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/room", async (req, res) => {
  try {
    const { userId1, userId2, userName1, userName2 } = req.body;
    const roomId = [userId1, userId2].sort().join("-");

    let room = await ChatRoom.findOne({ roomId });

    if (!room) {
      let name1 = userName1 || "Anonymous";
      let name2 = userName2 || "Anonymous";

      try {
        const User = require("../models/User");
        const mongoose = require("mongoose");

        if (mongoose.Types.ObjectId.isValid(userId1)) {
          const user1 = await User.findById(userId1);
          if (user1) name1 = user1.anonymousName;
        }
        if (mongoose.Types.ObjectId.isValid(userId2)) {
          const user2 = await User.findById(userId2);
          if (user2) name2 = user2.anonymousName;
        }
      } catch (lookupErr) {
        console.warn("User lookup failed, using provided names:", lookupErr.message);
      }

      room = new ChatRoom({
        roomId,
        participants: [
          { userId: userId1, userName: name1, joinedAt: new Date() },
          { userId: userId2, userName: name2, joinedAt: new Date() },
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