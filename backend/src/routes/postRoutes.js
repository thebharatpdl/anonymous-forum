const express = require("express");
const router = express.Router();

const Post = require("../models/Post");

//
// CREATE POST
//
router.post("/", async (req, res) => {
  try {
    const newPost = new Post({
      content: req.body.content,
      username: req.body.username || "anon_user",
    });

    const savedPost = await newPost.save();

    //
    // REALTIME SOCKET EVENT
    //
    const io = req.app.get("io");

    if (io) {
      io.emit("new_post", savedPost);
    }

    res.status(201).json(savedPost);
  } catch (err) {
    console.error("Create post error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
});

//
// GET ALL POSTS
//
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find().sort({
      createdAt: -1,
    });

    res.json(posts);
  } catch (err) {
    console.error("Get posts error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
});

//
// LIKE POST
//
router.post("/like/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    //
    // INCREASE LIKE COUNT
    //
    post.likes = (post.likes || 0) + 1;

    const updatedPost = await post.save();

    //
    // REALTIME SOCKET EVENT
    //
    const io = req.app.get("io");

    if (io) {
      io.emit("like_updated", {
        postId: updatedPost._id.toString(),
        likes: updatedPost.likes,
      });
    }

    res.json({
      likes: updatedPost.likes,
    });
  } catch (err) {
    console.error("Like post error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
});

//
// COMMENT ON POST
//
router.post("/comment/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    //
    // CREATE COMMENT
    //
    const newComment = {
      content: req.body.content,
      username: req.body.username || "anon_user",
      createdAt: new Date().toISOString(),
    };

    //
    // ENSURE COMMENTS ARRAY EXISTS
    //
    post.comments = post.comments || [];

    //
    // ADD COMMENT TO TOP
    //
    post.comments.unshift(newComment);

    //
    // SAVE UPDATED POST
    //
    await post.save();

    //
    // REALTIME SOCKET EVENT
    //
    const io = req.app.get("io");

    if (io) {
      io.emit("comment_added", {
        postId: post._id.toString(),
        comment: newComment,
      });
    }

    //
    // RETURN COMMENT
    //
    res.status(201).json(newComment);

  } catch (err) {
    console.error("Comment error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
});

//
// REPOST POST
//
router.post("/repost/:id", async (req, res) => {
  try {
    const originalPost = await Post.findById(req.params.id);

    if (!originalPost) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    //
    // CREATE REPOST
    //
    const repost = new Post({
      content: originalPost.content,

      username:
        req.body.username || "anon_user",

      repostOf: originalPost._id,
    });

    const savedRepost = await repost.save();

    //
    // REALTIME SOCKET EVENT
    //
    const io = req.app.get("io");

    if (io) {
      io.emit("new_post", savedRepost);
    }

    res.status(201).json(savedRepost);

  } catch (err) {
    console.error("Repost error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
});

module.exports = router;