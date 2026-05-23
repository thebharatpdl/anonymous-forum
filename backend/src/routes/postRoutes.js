const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/authMiddleware");
const { sendPushNotification } = require("../utils/sendPushNotification");

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
    let posts = await Post.find().sort({ createdAt: -1 });
    
    // If user is authenticated, filter out hidden posts
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
    } catch (e) {
      // No auth or invalid token, return all posts
    }
    
    res.json(posts);
  } catch (err) {
    console.error("Get posts error:", err);
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

// ============================================
// EDIT POST (Protected - User can edit own posts)
// ============================================
router.put("/:id", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    // Check if user owns the post
    if (post.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to edit this post" });
    }
    
    post.content = req.body.content;
    post.edited = true;
    await post.save();
    
    const io = req.app.get("io");
    if (io) {
      io.emit("post_edited", { postId: post._id.toString(), content: post.content });
    }
    
    res.json({ content: post.content, edited: true });
  } catch (err) {
    console.error("Edit post error:", err);
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
// LIKE POST - WITH DUPLICATE PREVENTION & PUSH NOTIFICATION
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

    // Initialize likedBy array if it doesn't exist
    if (!post.likedBy) {
      post.likedBy = [];
    }

    const userIdStr = userId ? userId.toString() : null;
    const alreadyLiked = userIdStr && post.likedBy.includes(userIdStr);

    if (alreadyLiked) {
      // UNLIKE - Remove the like
      post.likes = Math.max(0, (post.likes || 0) - 1);
      post.likedBy = post.likedBy.filter(id => id !== userIdStr);
      await post.save();

      const io = req.app.get("io");
      io.emit("like_updated", {
        postId: post._id.toString(),
        likes: post.likes,
      });

      return res.json({ likes: post.likes, liked: false });
    } else {
      // LIKE - Add the like
      post.likes = (post.likes || 0) + 1;
      if (userIdStr) {
        post.likedBy.push(userIdStr);
      }
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
        io.to(`user_${post.authorId}`).emit("new_notification", notification);
        console.log(`📡 Emitted new_notification to user_${post.authorId}`);

        // ✅ SEND PUSH NOTIFICATION
        const User = require("../models/User");
        const postAuthor = await User.findById(post.authorId);
        if (postAuthor && postAuthor.pushTokens && postAuthor.pushTokens.length > 0) {
          for (const pushToken of postAuthor.pushTokens) {
            await sendPushNotification(
              pushToken,
              `${userName} liked your post`,
              post.content.substring(0, 50) + (post.content.length > 50 ? '...' : ''),
              { type: 'post', postId: post._id.toString() }
            );
          }
        }
      }

      const io = req.app.get("io");
      io.emit("like_updated", {
        postId: post._id.toString(),
        likes: post.likes,
      });

      return res.json({ likes: post.likes, liked: true });
    }
  } catch (err) {
    console.error("Like post error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// COMMENT ON POST - WITH NOTIFICATION & PUSH NOTIFICATION
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
      io.to(`user_${post.authorId}`).emit("new_notification", notification);
      console.log(`📡 Emitted new_notification to user_${post.authorId}`);

      // ✅ SEND PUSH NOTIFICATION
      const User = require("../models/User");
      const postAuthor = await User.findById(post.authorId);
      if (postAuthor && postAuthor.pushTokens && postAuthor.pushTokens.length > 0) {
        for (const pushToken of postAuthor.pushTokens) {
          await sendPushNotification(
            pushToken,
            `${userName} commented on your post`,
            content.substring(0, 50) + (content.length > 50 ? '...' : ''),
            { type: 'post', postId: post._id.toString() }
          );
        }
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
// SAVE POST (Protected)
// ============================================
router.post("/save/:id", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const userId = req.user._id;
    const isSaved = req.user.savedPosts?.includes(post._id);

    if (isSaved) {
      // Unsave
      req.user.savedPosts = req.user.savedPosts.filter(
        id => id.toString() !== post._id.toString()
      );
      await req.user.save();
      return res.json({ saved: false, message: "Post unsaved" });
    } else {
      // Save
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

// ============================================
// GET SAVED POSTS
// ============================================
router.get("/saved", protect, async (req, res) => {
  try {
    const savedPosts = await Post.find({
      _id: { $in: req.user.savedPosts || [] }
    }).sort({ createdAt: -1 });
    res.json(savedPosts);
  } catch (err) {
    console.error("Get saved posts error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// NOT INTERESTED / HIDE POST
// ============================================
router.post("/hide/:id", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (!req.user.hiddenPosts) {
      req.user.hiddenPosts = [];
    }

    const alreadyHidden = req.user.hiddenPosts.includes(post._id);

    if (alreadyHidden) {
      // Unhide
      req.user.hiddenPosts = req.user.hiddenPosts.filter(
        id => id.toString() !== post._id.toString()
      );
      await req.user.save();
      return res.json({ hidden: false, message: "Post unhidden" });
    } else {
      // Hide
      req.user.hiddenPosts.push(post._id);
      await req.user.save();
      return res.json({ hidden: true, message: "Post hidden" });
    }
  } catch (err) {
    console.error("Hide post error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// REPORT POST
// ============================================
router.post("/report/:id", protect, async (req, res) => {
  try {
    const { reason } = req.body;
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (!req.user.reportedPosts) {
      req.user.reportedPosts = [];
    }

    // Check if already reported
    const alreadyReported = req.user.reportedPosts.some(
      r => r.postId.toString() === post._id.toString()
    );

    if (alreadyReported) {
      return res.status(400).json({ message: "Already reported this post" });
    }

    req.user.reportedPosts.push({
      postId: post._id,
      reason: reason,
      reportedAt: new Date(),
    });
    
    await req.user.save();

    // Optional: Create notification for admin
    console.log(`📢 Post ${post._id} reported by ${req.user.anonymousName} for: ${reason}`);

    res.json({ reported: true, message: "Post reported. We'll review it." });
  } catch (err) {
    console.error("Report post error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;