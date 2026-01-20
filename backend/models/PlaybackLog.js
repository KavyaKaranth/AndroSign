const mongoose = require("mongoose");

const PlaybackLogSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true },
    deviceName: String,

    mediaId: { type: String, required: true },
    mediaName: String,

    playlistId: String,

    startedAt: { type: Date, required: true },
    endedAt: { type: Date },
    duration: { type: Number }, // seconds
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlaybackLog", PlaybackLogSchema);
