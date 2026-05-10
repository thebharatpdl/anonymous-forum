const express = require("express");
const router = express.Router();
const ChatRoom = require("../models/ChatRoom");

// Create or get existing chat room
router.post("/room", async (req, res) => {
  try {
    const { userId1, userId2 } = req.body;
    const roomId = [userId1, userId2].sort().join("-");
    
    let room = await ChatRoom.findOne({ roomId });
    
    if (!room) {
      room = new ChatRoom({
        roomId,
        participants: [
          { userId: userId1, userName: "Anonymous", joinedAt: new Date() },
          { userId: userId2, userName: "Anonymous", joinedAt: new Date() },
        ],
        messages: [],
      });
      await room.save();
    }
    
    res.json(room);
  } catch (error) {
    console.error("Error creating chat room:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get chat history
router.get("/history/:roomId", async (req, res) => {
  try {
    const room = await ChatRoom.findOne({ roomId: req.params.roomId });
    res.json(room?.messages || []);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's chat rooms
router.get("/rooms/:userId", async (req, res) => {
  try {
    const rooms = await ChatRoom.find({
      "participants.userId": req.params.userId,
    }).sort({ updatedAt: -1 });
    res.json(rooms);
  } catch (error) {
    console.error("Error fetching user rooms:", error);
    res.status(500).json({ error: error.message });
  }
});

// Mark messages as read
router.post("/read/:roomId/:userId", async (req, res) => {
  try {
    const { roomId, userId } = req.params;
    
    await ChatRoom.updateMany(
      { 
        roomId, 
        "messages.readBy": { $ne: userId },
        "messages.senderId": { $ne: userId }
      },
      { $addToSet: { "messages.$[].readBy": userId } }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;