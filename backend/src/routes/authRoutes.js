const express = require("express");
const router = express.Router();
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const generateAnonymousName = () => {
  const prefixes = ["Silent", "Hidden", "Shadow", "Ghost", "Mystic", "Cosmic", "Dark", "Light"];
  const suffixes = ["Wolf", "Fox", "Owl", "Cat", "Bird", "Star", "Moon", "Cloud"];
  const numbers = Math.floor(Math.random() * 9000) + 1000;
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${prefix}${suffix}_${numbers}`;
};

// ✅ NEW — GET ALL USERS (for People tab)
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

router.post("/anonymous/register", async (req, res) => {
  try {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const fakeEmail = `anon_${random}_${timestamp}@anonymous.local`;
    const fakePassword = Math.random().toString(36).substring(2, 20);
    const anonymousName = generateAnonymousName();

    const user = new User({ email: fakeEmail, password: fakePassword, anonymousName });
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
      },
    });
  } catch (error) {
    console.error("Auto-register error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Email already registered" });

    const anonymousName = generateAnonymousName();
    const user = new User({ email, password, anonymousName });
    await user.save();
    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        anonymousName: user.anonymousName,
        avatarColor: user.avatarColor,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: error.message });
  }
});

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
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token provided" });

    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_secret_key_here");
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      id: user._id.toString(),
      email: user.email,
      anonymousName: user.anonymousName,
      avatarColor: user.avatarColor,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
});

module.exports = router;