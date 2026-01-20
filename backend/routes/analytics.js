const express = require("express");
const router = express.Router();

const Device = require("../models/Device");
const Media = require("../models/Media");
const Playlist = require("../models/Playlist");
const Activity = require("../models/Activity");
const authMiddleware = require("../middleware/auth");

// helper for time range
const isTimeInRange = (time, start, end) => {
  if (!start || !end) return false;
  if (start < end) return time >= start && time < end;
  return time >= start || time < end;
};

// ================= OVERVIEW =================
router.get("/overview", authMiddleware, async (req, res) => {
  try {
    const totalDevices = await Device.countDocuments();
    const activeDevices = await Device.countDocuments({ status: "online" });
    const totalMedia = await Media.countDocuments();

    const now = new Date();
    const time = now.toTimeString().slice(0, 5);

    const playlists = await Playlist.find();
    const activePlaylists = playlists.filter(p =>
      isTimeInRange(time, p.startTime, p.endTime)
    );

    res.json({
      devices: {
        active: activeDevices,
        total: totalDevices,
      },
      totalMedia,
      activePlaylists: activePlaylists.length,
    });
  } catch (err) {
    res.status(500).json({ error: "Analytics fetch failed" });
  }
});

// ================= RECENT ACTIVITY =================
router.get("/activity", authMiddleware, async (req, res) => {
  try {
    const activities = await Activity.find()
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ activities });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
