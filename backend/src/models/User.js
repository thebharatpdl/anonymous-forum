const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  anonymousName: {
    type: String,
    required: true,
  },
  avatarColor: {
    type: String,
    default: "#6C63FF",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
bio: {
  type: String,
  default: "",
  maxlength: 150,
}, 
savedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    default: [],
  }],
   hiddenPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    default: [],
  }],
  reportedPosts: [{
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    reason: { type: String },
    reportedAt: { type: Date, default: Date.now },
  }],

    following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: [],
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: [],
  }],
  
});

userSchema.pre("save", async function() {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);