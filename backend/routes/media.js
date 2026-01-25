const express = require('express');
const Media = require('../models/Media');
const authMiddleware = require('../middleware/auth');
const Activity = require('../models/Activity');
const uploadToS3 = require("../utils/s3");

const router = express.Router();

// AWS S3 Configuration
const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});


// Create media (admin)
const multer = require("multer");
const path = require("path");

/*const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null,file.originalname);
  },
});*/

const storage = multer.memoryStorage();

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

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

      // ✅ FIXED: Properly detect image vs video
      let type = 'other';
   
      if (file.mimetype.startsWith('image/')) {
        type = 'image';
      } else if (file.mimetype.startsWith('video/')) {
        type = 'video';
      }
      
    const uploadToS3 = async (file) => {
   const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: `media/${Date.now()}_${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  const result = await s3.upload(params).promise();
  return result.Location; // S3 public URL
};

      const s3Url = await uploadToS3(file);

      const media = await Media.create({
        filename: file.originalname, // stored filename (with timestamp)
        originalName: file.originalname, // original filename
        type: type,
        size: file.size,
        url: s3Url, 
      });
      const io = req.app.get("io");
// Emit WebSocket event for new media upload
const activity = {
  type: "MEDIA_UPLOADED",
  message: `New media uploaded: ${media.originalName}`,
  time: new Date(),
};

io.emit("activity", activity);
await Activity.create(activity);
io.emit("analytics-updated");

      console.log(`✅ Uploaded ${type}: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

      res.status(201).json({ media });
    } catch (err) {
      console.error('Upload error:', err);
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