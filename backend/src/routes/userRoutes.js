const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/authMiddleware");

// Follow a user
router.post("/follow/:userId", protect, async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.userId);
    if (!userToFollow) {
      return res.status(404).json({ error: "User not found" });
    }

    if (req.user._id.toString() === req.params.userId) {
      return res.status(400).json({ error: "Cannot follow yourself" });
    }

    // Initialize arrays if they don't exist
    if (!req.user.following) req.user.following = [];
    if (!userToFollow.followers) userToFollow.followers = [];

    // Check if already following
    const alreadyFollowing = req.user.following.some(
      id => id.toString() === req.params.userId
    );

    if (alreadyFollowing) {
      return res.status(400).json({ error: "Already following this user" });
    }

    // Add to following list (current user)
    req.user.following.push(req.params.userId);
    await req.user.save();

    // Add to followers list (target user)
    userToFollow.followers.push(req.user._id);
    await userToFollow.save();

    // Create notification
    const notification = new Notification({
      recipientId: req.params.userId,
      senderId: req.user._id,
      senderName: req.user.anonymousName,
      type: "follow",
      content: `${req.user.anonymousName} started following you`,
    });
    await notification.save();

    const io = req.app.get("io");
    io.to(`user_${req.params.userId}`).emit("new_notification", notification);

    res.json({ 
      following: true, 
      followersCount: userToFollow.followers.length,
      followingCount: req.user.following.length
    });
  } catch (error) {
    console.error("Follow error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Unfollow a user
router.post("/unfollow/:userId", protect, async (req, res) => {
  try {
    const userToUnfollow = await User.findById(req.params.userId);
    if (!userToUnfollow) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!req.user.following) req.user.following = [];
    if (!userToUnfollow.followers) userToUnfollow.followers = [];

    // Remove from following list (current user)
    req.user.following = req.user.following.filter(
      id => id.toString() !== req.params.userId
    );
    await req.user.save();

    // Remove from followers list (target user)
    userToUnfollow.followers = userToUnfollow.followers.filter(
      id => id.toString() !== req.user._id.toString()
    );
    await userToUnfollow.save();

    res.json({ 
      following: false, 
      followersCount: userToUnfollow.followers.length,
      followingCount: req.user.following.length
    });
  } catch (error) {
    console.error("Unfollow error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get follow status
router.get("/status/:userId", protect, async (req, res) => {
  try {
    const isFollowing = req.user.following?.some(
      id => id.toString() === req.params.userId
    ) || false;
    res.json({ isFollowing });
  } catch (error) {
    console.error("Status error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's followers (with safe fallback)
router.get("/followers/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.json({ followers: [], count: 0 });
    }
    res.json({
      followers: user.followers || [],
      count: user.followers?.length || 0
    });
  } catch (error) {
    console.error("Followers error:", error);
    res.json({ followers: [], count: 0 });
  }
});

// Get user's following (with safe fallback)
router.get("/following/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.json({ following: [], count: 0 });
    }
    res.json({
      following: user.following || [],
      count: user.following?.length || 0
    });
  } catch (error) {
    console.error("Following error:", error);
    res.json({ following: [], count: 0 });
  }
});

// Get priority feed (followed users first)
router.get("/feed", protect, async (req, res) => {
  try {
    const followingIds = req.user.following || [];
    const allPosts = await Post.find().sort({ createdAt: -1 });
    
    const followedPosts = allPosts.filter(
      post => followingIds.includes(post.authorId?.toString())
    );
    const otherPosts = allPosts.filter(
      post => !followingIds.includes(post.authorId?.toString())
    );
    
    res.json([...followedPosts, ...otherPosts]);
  } catch (error) {
    console.error("Feed error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;