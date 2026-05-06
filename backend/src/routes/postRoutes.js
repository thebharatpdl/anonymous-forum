const express = require("express");
const router = express.Router();
const Post = require("../models/Post");

// CREATE POST
router.post("/", async (req, res) => {
  try {
    const newPost = new Post({
      content: req.body.content,
      username: req.body.username || "anon_user"
    });

    const savedPost = await newPost.save();
    
    // Emit real-time update
    const io = req.app.get("io");
    if (io) {
      io.emit("new_post", savedPost);
    }
    
    res.status(201).json(savedPost); // Use 201 status for created
  } catch (err) {
    console.error("Create post error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET ALL POSTS (FEED)
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.error("Get posts error:", err);
    res.status(500).json({ error: err.message });
  }
});

// LIKE POST
router.post("/like/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // increase like count
    post.likes = (post.likes || 0) + 1;
    const updatedPost = await post.save();
    
    // Emit real-time like update
    const io = req.app.get("io");
    if (io) {
      io.emit("like_updated", { 
        postId: updatedPost._id.toString(), 
        likes: updatedPost.likes 
      });
    }
    
    res.json({ likes: updatedPost.likes });
  } catch (err) {
    console.error("Like post error:", err);
    res.status(500).json({ error: err.message });
  }
});

// REPOST - FIXED VERSION
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
    
    // Emit real-time update for the repost
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

module.exports = router;