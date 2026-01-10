const express = require('express');
const Media = require('../models/Media');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Create media (admin)
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null,file.originalname); // use original filename
  },
});

const upload = multer({ storage });


router.post(
  "/",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const media = await Media.create({
        filename: file.originalname, // store clean name
        originalName: file.originalname,
        type: file.mimetype.startsWith("image") ? "image" : "other",
        size: file.size,
        url: `http://192.168.0.101:5000/uploads/${file.originalname}`,
      });

      res.status(201).json({ media });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.get('/', authMiddleware, async (req, res) => {
  try {
    const media = await Media.find().sort({ uploadedAt: -1 });
    res.json({ media });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
module.exports = router;
