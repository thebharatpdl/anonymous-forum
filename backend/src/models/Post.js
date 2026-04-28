const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  username: {
    type: String,
    default: "anon_user"
  },
  likes: {
    type: Number,
    default: 0
  },
  repostOf:{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Post',
  default: null
  }
}, { timestamps: true });

module.exports = mongoose.model("Post", postSchema);