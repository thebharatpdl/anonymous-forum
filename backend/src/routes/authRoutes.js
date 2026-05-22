const express = require("express");
const router = express.Router();
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { protect } = require("../middleware/authMiddleware");

const generateAnonymousName = () => {
  const prefixes = ["Silent", "Hidden", "Shadow", "Ghost", "Mystic", "Cosmic", "Dark", "Light"];
  const suffixes = ["Wolf", "Fox", "Owl", "Cat", "Bird", "Star", "Moon", "Cloud"];
  const numbers = Math.floor(Math.random() * 9000) + 1000;
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${prefix}${suffix}_${numbers}`;
};

// ✅ GET ALL USERS (for People tab)
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({})
      .select("_id anonymousName avatarColor")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(
      users.map((u) => ({
        id: u._id.toString(),
        anonymousName: u.anonymousName,
        avatarColor: u.avatarColor || "#6C63FF",
      }))
    );
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: error.message });
  }
});


// Get user by ID (for profile viewing)
router.get("/user/:id", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password -pushTokens");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({
      id: user._id,
      anonymousName: user.anonymousName,
      bio: user.bio || "",
      avatarColor: user.avatarColor,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ SAVE PUSH TOKEN
router.post("/push-token", protect, async (req, res) => {
  try {
    const { pushToken } = req.body;
    const user = await User.findById(req.user._id);
    
    if (!pushToken) {
      return res.status(400).json({ error: "Push token required" });
    }
    
    if (!user.pushTokens) {
      user.pushTokens = [];
    }
    
    if (!user.pushTokens.includes(pushToken)) {
      user.pushTokens.push(pushToken);
      await user.save();
      console.log(`✅ Push token added for user ${user.anonymousName}`);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error saving push token:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ REMOVE PUSH TOKEN (on logout)
router.post("/push-token/remove", protect, async (req, res) => {
  try {
    const { pushToken } = req.body;
    const user = await User.findById(req.user._id);
    
    if (user.pushTokens) {
      user.pushTokens = user.pushTokens.filter(t => t !== pushToken);
      await user.save();
      console.log(`✅ Push token removed for user ${user.anonymousName}`);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error removing push token:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ ANONYMOUS REGISTER - Added bio field
router.post("/anonymous/register", async (req, res) => {
  try {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const fakeEmail = `anon_${random}_${timestamp}@anonymous.local`;
    const fakePassword = Math.random().toString(36).substring(2, 20);
    const anonymousName = generateAnonymousName();

    const user = new User({ 
      email: fakeEmail, 
      password: fakePassword, 
      anonymousName,
      bio: "", // ✅ Added bio field
    });
    await user.save();
    const token = generateToken(user._id);

    console.log(`🎉 New anonymous user: ${anonymousName} id: ${user._id.toString()}`);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        anonymousName: user.anonymousName,
        avatarColor: user.avatarColor || "#6C63FF",
        bio: user.bio || "", // ✅ Added bio field
      },
    });
  } catch (error) {
    console.error("Auto-register error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ REGULAR REGISTER - Added bio field
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Email already registered" });

    const anonymousName = generateAnonymousName();
    const user = new User({ 
      email, 
      password, 
      anonymousName,
      bio: "", // ✅ Added bio field
    });
    await user.save();
    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        anonymousName: user.anonymousName,
        avatarColor: user.avatarColor,
        bio: user.bio || "", // ✅ Added bio field
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ LOGIN - Added bio field
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: "Invalid email or password" });

    const token = generateToken(user._id);
    res.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        anonymousName: user.anonymousName,
        avatarColor: user.avatarColor,
        bio: user.bio || "", // ✅ Added bio field
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ GET CURRENT USER - Added bio field
router.get("/me", protect, async (req, res) => {
  try {
    res.json({
      id: req.user._id.toString(),
      email: req.user.email,
      anonymousName: req.user.anonymousName,
      avatarColor: req.user.avatarColor,
      bio: req.user.bio || "", // ✅ Added bio field
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
});

// ✅ UPDATE USER PROFILE
router.put("/profile", protect, async (req, res) => {
  try {
    const { bio } = req.body;
    
    // Only update bio (display name is fixed for anonymous users)
    if (bio !== undefined) {
      req.user.bio = bio;
    }
    
    await req.user.save();
    
    res.json({
      id: req.user._id.toString(),
      email: req.user.email,
      anonymousName: req.user.anonymousName,
      avatarColor: req.user.avatarColor,
      bio: req.user.bio || "",
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;