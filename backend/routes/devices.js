const express = require('express');
const Device = require('../models/Device');
const authMiddleware = require('../middleware/auth');
const jwt = require('jsonwebtoken');

const router = express.Router();

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

module.exports = router;
