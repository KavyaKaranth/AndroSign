const express = require('express');
const Device = require('../models/Device');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const jwt = require('jsonwebtoken');

// Generate QR Code for device registration
router.post('/generate-qr', authMiddleware, async (req, res) => {
  try {
    const registrationToken = jwt.sign(
      { type: 'device-registration', userId: req.userId },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.json({ 
      token: registrationToken,
      message: 'QR code data generated'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// GET all devices (protected route)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const devices = await Device.find().sort({ registeredAt: -1 });
    res.json({ devices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single device
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

// REGISTER new device
router.post('/register', async (req, res) => {
  try {
    const { deviceId, name, location } = req.body;

    // Check if device already exists
    const existingDevice = await Device.findOne({ deviceId });
    if (existingDevice) {
      return res.status(400).json({ error: 'Device already registered' });
    }

    // Create device
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

// UPDATE device status (heartbeat)
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

// DELETE device
router.delete('/:deviceId', authMiddleware, async (req, res) => {
  try {
    await Device.findOneAndDelete({ deviceId: req.params.deviceId });
    res.json({ message: 'Device deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;