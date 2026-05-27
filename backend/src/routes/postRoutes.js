const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/authMiddleware");
const { sendPushNotification } = require("../utils/sendPushNotification");

// ============================================
// CREATE POST
// ============================================
router.post("/", protect, async (req, res) => {
  try {
    const newPost = new Post({
      content: req.body.content,
      username: req.user.anonymousName,
      authorId: req.user._id,
    });
    const savedPost = await newPost.save();
    const io = req.app.get("io");
    if (io) io.emit("new_post", savedPost);
    res.status(201).json(savedPost);
  } catch (err) {
    console.error("Create post error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// GET ALL POSTS
// ============================================
router.get("/", async (req, res) => {
  try {
    let posts = await Post.find().sort({ createdAt: -1 });
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (token) {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_secret_key_here");
        const User = require("../models/User");
        const user = await User.findById(decoded.userId);
        if (user && user.hiddenPosts && user.hiddenPosts.length > 0) {
          const hiddenIds = user.hiddenPosts.map(id => id.toString());
          posts = posts.filter(post => !hiddenIds.includes(post._id.toString()));
        }
      }
    } catch (e) {}
    res.json(posts);
  } catch (err) {
    console.error("Get posts error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET SAVED POSTS - MUST BE BEFORE /:id
router.get("/saved", protect, async (req, res) => {
  try {
    console.log("📝 Fetching saved posts for user:", req.user._id);
    const savedPosts = await Post.find({
      _id: { $in: req.user.savedPosts || [] }
    }).sort({ createdAt: -1 });
    console.log("✅ Found saved posts:", savedPosts.length);
    res.json(savedPosts);
  } catch (err) {
    console.error("Get saved posts error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET SINGLE POST - MUST BE AFTER /saved
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch (err) {
    console.error("Get post error:", err);
    res.status(500).json({ error: err.message });
  }
});

// EDIT POST
router.put("/:id", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    post.content = req.body.content;
    post.edited = true;
    await post.save();
    const io = req.app.get("io");
    if (io) io.emit("post_edited", { postId: post._id.toString(), content: post.content });
    res.json({ content: post.content, edited: true });
  } catch (err) {
    console.error("Edit post error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE POST
router.delete("/:id", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    await post.deleteOne();
    const io = req.app.get("io");
    if (io) io.emit("post_deleted", { postId: req.params.id });
    res.json({ message: "Post deleted" });
  } catch (err) {
    console.error("Delete post error:", err);
    res.status(500).json({ error: err.message });
  }
});

// LIKE POST
router.post("/like/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    let userId = null, userName = "Someone";
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (token) {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_secret_key_here");
        const User = require("../models/User");
        const user = await User.findById(decoded.userId);
        if (user) { userId = user._id; userName = user.anonymousName; }
      }
    } catch (e) {}
    if (!post.likedBy) post.likedBy = [];
    const userIdStr = userId ? userId.toString() : null;
    const alreadyLiked = userIdStr && post.likedBy.includes(userIdStr);
    if (alreadyLiked) {
      post.likes = Math.max(0, (post.likes || 0) - 1);
      post.likedBy = post.likedBy.filter(id => id !== userIdStr);
      await post.save();
      const io = req.app.get("io");
      io.emit("like_updated", { postId: post._id.toString(), likes: post.likes });
      return res.json({ likes: post.likes, liked: false });
    } else {
      post.likes = (post.likes || 0) + 1;
      if (userIdStr) post.likedBy.push(userIdStr);
      await post.save();
      if (userId && post.authorId && userId.toString() !== post.authorId.toString()) {
        const notification = new Notification({
          recipientId: post.authorId, senderId: userId, senderName: userName,
          type: "like", postId: post._id, content: `${userName} liked your post`,
        });
        await notification.save();
        const io = req.app.get("io");
        io.to(`user_${post.authorId}`).emit("new_notification", notification);
        const User = require("../models/User");
        const postAuthor = await User.findById(post.authorId);
        if (postAuthor?.pushTokens?.length > 0) {
          for (const pushToken of postAuthor.pushTokens) {
            await sendPushNotification(pushToken, `${userName} liked your post`,
              post.content.substring(0, 50), { type: 'post', postId: post._id.toString() });
          }
        }
      }
      const io = req.app.get("io");
      io.emit("like_updated", { postId: post._id.toString(), likes: post.likes });
      return res.json({ likes: post.likes, liked: true });
    }
  } catch (err) {
    console.error("Like post error:", err);
    res.status(500).json({ error: err.message });
  }
});

// COMMENT ON POST
router.post("/comment/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    let userId = null, userName = "Someone";
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (token) {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_secret_key_here");
        const User = require("../models/User");
        const user = await User.findById(decoded.userId);
        if (user) { userId = user._id; userName = user.anonymousName; }
      }
    } catch (e) {}
    if (!req.body.content) return res.status(400).json({ message: "Content required" });
    const newComment = { content: req.body.content, username: userName, createdAt: new Date().toISOString() };
    post.comments = post.comments || [];
    post.comments.unshift(newComment);
    await post.save();
    if (userId && post.authorId && userId.toString() !== post.authorId.toString()) {
      const notification = new Notification({
        recipientId: post.authorId, senderId: userId, senderName: userName,
        type: "comment", postId: post._id,
        content: `${userName} commented: "${req.body.content.substring(0, 50)}"`,
      });
      await notification.save();
      const io = req.app.get("io");
      io.to(`user_${post.authorId}`).emit("new_notification", notification);
    }
    const io = req.app.get("io");
    if (io) io.emit("comment_added", { postId: post._id.toString(), comment: newComment });
    res.status(201).json(newComment);
  } catch (err) {
    console.error("Comment error:", err);
    res.status(500).json({ error: err.message });
  }
});

// REPOST
router.post("/repost/:id", async (req, res) => {
  try {
    const originalPost = await Post.findById(req.params.id);
    if (!originalPost) return res.status(404).json({ message: "Post not found" });
    const repost = new Post({
      content: originalPost.content,
      username: req.body.username || "anon_user",
      repostOf: originalPost._id,
    });
    const savedRepost = await repost.save();
    const io = req.app.get("io");
    if (io) io.emit("new_post", savedRepost);
    res.status(201).json(savedRepost);
  } catch (err) {
    console.error("Repost error:", err);
    res.status(500).json({ error: err.message });
  }
});

// SAVE POST
router.post("/save/:id", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const isSaved = req.user.savedPosts?.includes(post._id);
    if (isSaved) {
      req.user.savedPosts = req.user.savedPosts.filter(id => id.toString() !== post._id.toString());
      await req.user.save();
      return res.json({ saved: false, message: "Post unsaved" });
    } else {
      if (!req.user.savedPosts) req.user.savedPosts = [];
      req.user.savedPosts.push(post._id);
      await req.user.save();
      return res.json({ saved: true, message: "Post saved" });
    }
  } catch (err) {
    console.error("Save post error:", err);
    res.status(500).json({ error: err.message });
  }
});

// HIDE POST
router.post("/hide/:id", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (!req.user.hiddenPosts) req.user.hiddenPosts = [];
    const alreadyHidden = req.user.hiddenPosts.includes(post._id);
    if (alreadyHidden) {
      req.user.hiddenPosts = req.user.hiddenPosts.filter(id => id.toString() !== post._id.toString());
      await req.user.save();
      return res.json({ hidden: false });
    } else {
      req.user.hiddenPosts.push(post._id);
      await req.user.save();
      return res.json({ hidden: true });
    }
  } catch (err) {
    console.error("Hide post error:", err);
    res.status(500).json({ error: err.message });
  }
});

// REPORT POST
router.post("/report/:id", protect, async (req, res) => {
  try {
    const { reason } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (!req.user.reportedPosts) req.user.reportedPosts = [];
    const alreadyReported = req.user.reportedPosts.some(r => r.postId.toString() === post._id.toString());
    if (alreadyReported) return res.status(400).json({ message: "Already reported" });
    req.user.reportedPosts.push({ postId: post._id, reason, reportedAt: new Date() });
    await req.user.save();
    res.json({ reported: true, message: "Post reported" });
  } catch (err) {
    console.error("Report post error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;