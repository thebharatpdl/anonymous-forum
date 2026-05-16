const mongoose = require("mongoose");

const reactionSchema = new mongoose.Schema({
  emoji: { type: String, required: true },
  userId: { type: String, required: true },
}, { _id: false });

const messageSchema = new mongoose.Schema({
  content: { type: String, required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, default: "Anonymous" },
  readBy: [{ type: String }],
  reactions: [reactionSchema],
  createdAt: { type: Date, default: Date.now },
});

const chatRoomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  participants: [{
    userId: { type: String, required: true },
    userName: { type: String, default: "Anonymous" },
    joinedAt: { type: Date, default: Date.now },
  }],
  messages: [messageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// No pre-save middleware to avoid errors

module.exports = mongoose.model("ChatRoom", chatRoomSchema);