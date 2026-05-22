const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  content: { type: String, required: true },
  username: { type: String, default: "anon_user" },
  createdAt: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
  content: { type: String, required: true },
  username: { type: String, default: "anon_user" },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  likes: { type: Number, default: 0 },
  likedBy: [{ type: String }], // ✅ Add this array to track who liked
  repostOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
  comments: [commentSchema]
}, { timestamps: true });

module.exports = mongoose.model("Post", postSchema);