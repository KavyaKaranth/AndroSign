const express = require('express');
const Playlist = require('../models/Playlist');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Create playlist
router.post('/', authMiddleware, async (req, res) => {
  try {
    
     const { name, startTime, endTime, items } = req.body;
    if (!name || !startTime || !endTime || !items?.length) {
    return res.status(400).json({ error: "Missing fields" });
  }
   
const playlist = await Playlist.create({
  name,
  startTime,
  endTime,
  items
});


    res.status(201).json({ playlist });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all playlists
router.get("/", authMiddleware, async (req, res) => {
  try {
    const playlists = await Playlist.find()
      .populate("items.media")
      .sort({ createdAt: -1 });

    res.json({ playlists });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Get playlist by ID
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const playlist = await Playlist.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const playlist = await Playlist.findByIdAndDelete(req.params.id);

    if (!playlist) {
      return res.status(404).json({ error: "Playlist not found" });
    }

    res.json({ message: "Playlist deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;
