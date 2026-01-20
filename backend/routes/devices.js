const express = require('express');
const Device = require('../models/Device');
const Playlist = require('../models/Playlist');
const authMiddleware = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const Activity = require("../models/Activity");

const router = express.Router();
router.get('/__test', (req, res) => {
  res.send('DEVICES ROUTE WORKING');
});

/**
 * Generate QR Code data for device registration
 * Dashboard → clicks "Add New Device"
 */
router.post('/generate-qr', authMiddleware, async (req, res) => {
  try {
    const registrationToken = jwt.sign(
      { type: 'device-registration', userId: req.userId },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      apiUrl: process.env.API_URL,
      token: registrationToken
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user count
router.get("/users", async (req, res) => {
  try {
    const User = require("../models/User");
    const userCount = await User.countDocuments();
    res.json({ userCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }   
});
/**
 * Get all devices (Dashboard)
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const devices = await Device.find().sort({ registeredAt: -1 });
    res.json({ devices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get single device
 */
router.get('/:deviceId', authMiddleware, async (req, res) => {
  try {
    const device = await Device.findOne({ deviceId: req.params.deviceId });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.json({ device });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Register new device (QR-based)
 * Android App → Scan QR → Call this API
 */
router.post('/register', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'No registration token provided' });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (decoded.type !== 'device-registration') {
      return res.status(403).json({ error: 'Invalid registration token type' });
    }

    const { deviceId, name, location } = req.body;

    if (!deviceId || !name) {
      return res.status(400).json({ error: 'deviceId and name are required' });
    }

    const existingDevice = await Device.findOne({ deviceId });
    if (existingDevice) {
      return res.status(400).json({ error: 'Device already registered' });
    }

    const device = await Device.create({
      deviceId,
      name,
      location,
      status: 'online'
    });

    res.status(201).json({
      message: 'Device registered successfully',
      device
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Heartbeat (device alive check)
 */
router.post('/:deviceId/heartbeat', async (req, res) => {
  try {
    const device = await Device.findOneAndUpdate(
      { deviceId: req.params.deviceId },
      { status: 'online', lastSeen: new Date() },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({ device });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete device
 */
router.delete('/:deviceId', authMiddleware, async (req, res) => {
  try {
    await Device.findOneAndDelete({ deviceId: req.params.deviceId });
    res.json({ message: 'Device deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST assign playlists to device
router.post('/:deviceId/assign-playlists', authMiddleware, async (req, res) => {
  try {
    const { playlistIds } = req.body; // array of playlist IDs

    if (!Array.isArray(playlistIds) || playlistIds.length === 0) {
      return res.status(400).json({ error: 'playlistIds must be a non-empty array' });
    }

    // Validate playlists
    const playlists = await Playlist.find({ _id: { $in: playlistIds } });
    if (playlists.length !== playlistIds.length) {
      return res.status(404).json({ error: 'One or more playlists not found' });
    }

    const device = await Device.findOneAndUpdate(
      { deviceId: req.params.deviceId },
        {
        $addToSet: {
          playlists: { $each: playlistIds }
        }
      },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    // Notify device via WebSocket about playlist update
    const io = req.app.get("io");

io.emit("playlist-updated", {
  deviceId: req.params.deviceId,
});
const activity = {
  type: "PLAYLIST_ASSIGNED",
  message: `Playlist assigned to device ${req.params.deviceId}`,
  time: new Date(),
};

io.emit("activity", activity);
await Activity.create(activity);

io.emit("analytics-updated");

    res.json({
      message: 'Playlists assigned to device',
     
      playlists:device.playlists
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// GET playlist assigned to device
router.get('/:deviceId/playlist', async (req, res) => {
  try {
    const device = await Device.findOne({
      deviceId: req.params.deviceId
    }).populate({
      path: 'playlists',
      populate: {
        path: 'items.media'
      }
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({
      playlists: device.playlists
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST remove playlist from device
router.post("/:deviceId/remove-playlist", authMiddleware, async (req, res) => {
  try {
    const { playlistId } = req.body;

    if (!playlistId) {
      return res.status(400).json({ error: "playlistId is required" });
    }

    const device = await Device.findOneAndUpdate(
      { deviceId: req.params.deviceId },
      { $pull: { playlists: playlistId } },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    res.json({
      message: "Playlist removed from device",
      playlists: device.playlists
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
