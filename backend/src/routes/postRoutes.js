const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/authMiddleware");

// ============================================
// CREATE POST - PROTECTED ROUTE (requires auth)
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
    if (io) {
      io.emit("new_post", savedPost);
    }
    
    res.status(201).json(savedPost);
  } catch (err) {
    console.error("Create post error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// GET ALL POSTS (Public - No auth required)
// ============================================
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.error("Get posts error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// LIKE POST (Public - No auth required for anonymous)
// WITH NOTIFICATION
// ============================================
router.post("/like/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Get user from token if available
    let userId = null;
    let userName = "Someone";
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (token) {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_secret_key_here");
        const User = require("../models/User");
        const user = await User.findById(decoded.userId);
        if (user) {
          userId = user._id;
          userName = user.anonymousName;
        }
      }
    } catch (e) {}

    post.likes = (post.likes || 0) + 1;
    await post.save();

    // Create notification (don't notify yourself)
    if (userId && post.authorId && userId.toString() !== post.authorId.toString()) {
      const notification = new Notification({
        recipientId: post.authorId,
        senderId: userId,
        senderName: userName,
        type: "like",
        postId: post._id,
        content: `${userName} liked your post`,
      });
      await notification.save();
      console.log(`🔔 Notification saved: ${userName} liked post ${post._id}`);

      // Emit real-time notification
      const io = req.app.get("io");
      if (io) {
        io.to(`user_${post.authorId}`).emit("new_notification", notification);
        console.log(`📡 Emitted new_notification to user_${post.authorId}`);
      }
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("like_updated", {
        postId: post._id.toString(),
        likes: post.likes,
      });
    }

    res.json({ likes: post.likes });
  } catch (err) {
    console.error("Like post error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// COMMENT ON POST - WITH NOTIFICATION
// ============================================
router.post("/comment/:id", async (req, res) => {
  try {
    console.log("📝 Comment request received:", {
      postId: req.params.id,
      body: req.body
    });

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Get user from token if available
    let userId = null;
    let userName = "Someone";
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (token) {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_secret_key_here");
        const User = require("../models/User");
        const user = await User.findById(decoded.userId);
        if (user) {
          userId = user._id;
          userName = user.anonymousName;
        }
      }
    } catch (e) {}

    const content = req.body.content;
    if (!content) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    const newComment = {
      content: content,
      username: userName,
      createdAt: new Date().toISOString(),
    };

    post.comments = post.comments || [];
    post.comments.unshift(newComment);
    await post.save();

    console.log("✅ Comment saved:", newComment);

    // Create notification (don't notify yourself)
    if (userId && post.authorId && userId.toString() !== post.authorId.toString()) {
      const notification = new Notification({
        recipientId: post.authorId,
        senderId: userId,
        senderName: userName,
        type: "comment",
        postId: post._id,
        content: `${userName} commented: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
      });
      await notification.save();
      console.log(`🔔 Notification saved: ${userName} commented on post ${post._id}`);

      // Emit real-time notification
      const io = req.app.get("io");
      if (io) {
        io.to(`user_${post.authorId}`).emit("new_notification", notification);
        console.log(`📡 Emitted new_notification to user_${post.authorId}`);
      }
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("comment_added", {
        postId: post._id.toString(),
        comment: newComment,
      });
    }

    res.status(201).json(newComment);
  } catch (err) {
    console.error("Comment error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// REPOST POST (Public - No auth required)
// ============================================
router.post("/repost/:id", async (req, res) => {
  try {
    const originalPost = await Post.findById(req.params.id);
    if (!originalPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    const repost = new Post({
      content: originalPost.content,
      username: req.body.username || "anon_user",
      repostOf: originalPost._id,
    });

    const savedRepost = await repost.save();

    const io = req.app.get("io");
    if (io) {
      io.emit("new_post", savedRepost);
    }

    res.status(201).json(savedRepost);
  } catch (err) {
    console.error("Repost error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// DELETE POST (Protected - User can delete own posts)
// ============================================
router.delete("/:id", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    // Check if user owns the post
    if (post.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this post" });
    }
    
    await post.deleteOne();
    
    const io = req.app.get("io");
    if (io) {
      io.emit("post_deleted", { postId: req.params.id });
    }
    
    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error("Delete post error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// GET SINGLE POST
// ============================================
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json(post);
  } catch (err) {
    console.error("Get post error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;