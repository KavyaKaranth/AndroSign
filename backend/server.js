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
const analyticsRoutes = require("./routes/analytics");
const PlaybackLog = require("./models/PlaybackLog");
const Activity = require("./models/Activity");


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI,{
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
})
  .then(() => console.log('✅ MongoDB Connected Successfully!'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Connection event handlers
mongoose.connection.on("disconnected", () => {
  console.log("⚠️ MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  console.log("🔁 MongoDB reconnected");
});

mongoose.connection.on("error", (err) => {
  console.log("❌ MongoDB error:", err.message);
});


// Routes
app.get('/', (req, res) => {
  res.json({ message: 'AndroSign API is running!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/playlists', playlistRoutes);
//app.use("/uploads", express.static("uploads"));
app.use("/api/analytics", analyticsRoutes);

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

  socket.on("DEVICE_ONLINE",async ({ deviceId }) => {
    socket.deviceId = deviceId; // 🔑 store on socket

    onlineDevices.set(deviceId, socket.id);

    console.log("🟢 DEVICE ONLINE:", deviceId);
    const activity = {
    type: "DEVICE_ONLINE",
    message: `Device ${deviceId} came online`,
    time: new Date(),
  };

    io.emit("device-status", {
      deviceId,
      status: "online",
      lastSeen: new Date(),
    });
    
    io.emit("activity", activity);
    await Activity.create(activity);
    io.emit("analytics-updated");
  });
  // when media starts playing
socket.on("PLAYBACK_START", (data) => {
  socket.currentPlayback = {
    deviceId: data.deviceId,
    deviceName: data.deviceName,
    mediaId: data.mediaId,
    mediaName: data.mediaName,
    playlistId: data.playlistId,
    startedAt: new Date(),
  };
});

// when media finishes
socket.on("PLAYBACK_END", async () => {
  if (!socket.currentPlayback) return;

  const start = socket.currentPlayback.startedAt;
  const end = new Date();
  const duration = Math.floor((end - start) / 1000);

  await PlaybackLog.create({
    ...socket.currentPlayback,
    endedAt: end,
    duration,
  });

  socket.currentPlayback = null;
});

  socket.on("disconnect", async () => {
    const deviceId = socket.deviceId;
    if (!deviceId) return;

    onlineDevices.delete(deviceId);

    console.log("🔴 DEVICE OFFLINE:", deviceId);

    io.emit("device-status", {
      deviceId,
      status: "offline",
      lastSeen: new Date(),
    });
   const activity = {
    type: "DEVICE_OFFLINE",
    message: `Device ${deviceId} went offline`,
    time: new Date(),
  };
   console.log("🔥 EMITTING ACTIVITY:", activity);
      io.emit("activity", activity);
      await Activity.create(activity);
     io.emit("analytics-updated");
  });
});

setInterval(async () => {
  const now = new Date();

  await Device.updateMany(
    { lastSeen: { $lt: new Date(now - 60000) } }, // 60 sec
    { status: "offline" }
  );
}, 30000); // run every 30 sec

// Test activity endpoint
app.get("/test-activity", (req, res) => {
  const io = req.app.get("io");

  io.emit("activity", {
    type: "TEST",
    message: "This is a test activity",
    time: new Date(),
  });

  res.send("Activity sent");
});

server.listen(PORT, () => {
  console.log(`🚀 Server + WebSocket running on port  ${PORT}`);
});
