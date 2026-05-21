const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { protect } = require("../middleware/authMiddleware");

// Get user's notifications
router.get("/", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json(notifications);
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get unread count
router.get("/unread-count", protect, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipientId: req.user._id,
      read: false,
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
router.put("/:id/read", protect, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user._id },
      { read: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all as read
router.put("/read-all", protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user._id, read: false },
      { read: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;