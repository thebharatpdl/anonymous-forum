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

module.exports = router;