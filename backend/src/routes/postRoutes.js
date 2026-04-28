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
    res.json(savedPost);
  } catch (err) {
    res.status(500).json(err);
  }
});

// GET ALL POSTS (FEED)
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json(err);
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

    res.json(updatedPost);
  } catch (err) {
    res.status(500).json(err);
  }
});


// REPOST
router.post("/repost/:id", async (req, res) => {
  try {
    const originalPost = await Post.findById(req.params.id);

    if (!originalPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    const repost = new Post({
      content: originalPost.content,
      username: "anon_user",
      repostOf: originalPost._id,
    });

    const saved = await repost.save();

    res.json(saved);
  } catch (err) {
    res.status(500).json(err);
  }
});






module.exports = router;