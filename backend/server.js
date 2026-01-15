require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const mediaRoutes = require('./routes/media');
const playlistRoutes = require('./routes/playlists');
const Device = require("./models/Device");


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
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

// WebSocket Setup
const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
// Make io accessible to routes
app.set("io", io);


// Track online devices
const onlineDevices = new Map();

io.on("connection", (socket) => {
  console.log("🔌 WS connected:", socket.id);

  socket.on("DEVICE_ONLINE", ({ deviceId }) => {
    socket.deviceId = deviceId; // 🔑 store on socket

    onlineDevices.set(deviceId, socket.id);

    console.log("🟢 DEVICE ONLINE:", deviceId);

    io.emit("device-status", {
      deviceId,
      status: "online",
      lastSeen: new Date(),
    });
  });

  socket.on("disconnect", () => {
    const deviceId = socket.deviceId;
    if (!deviceId) return;

    onlineDevices.delete(deviceId);

    console.log("🔴 DEVICE OFFLINE:", deviceId);

    io.emit("device-status", {
      deviceId,
      status: "offline",
      lastSeen: new Date(),
    });
  });
});

setInterval(async () => {
  const now = new Date();

  await Device.updateMany(
    { lastSeen: { $lt: new Date(now - 60000) } }, // 60 sec
    { status: "offline" }
  );
}, 30000); // run every 30 sec


server.listen(5000, "0.0.0.0", () => {
  console.log("🚀 Server + WebSocket running on port 5000");
});
