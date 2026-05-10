const mongoose = require("mongoose");

// Message schema
const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
  },
  senderId: {
    type: String,
    required: true,
  },
  senderName: {
    type: String,
    default: "Anonymous",
  },
  readBy: [{
    type: String,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Chat Room schema
const chatRoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
  },
  participants: [{
    userId: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      default: "Anonymous",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  messages: [messageSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field on save
chatRoomSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("ChatRoom", chatRoomSchema);