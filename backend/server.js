require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const mediaRoutes = require('./routes/media');
const playlistRoutes = require('./routes/playlists');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully!'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'AndroSign API is running!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/playlists', playlistRoutes);
app.use("/uploads", express.static("uploads"))

const path = require("path");

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
console.log("Uploads path:", path.join(__dirname, "uploads"));



// Start Server
app.listen(5000, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});