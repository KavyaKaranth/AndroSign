const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  location: String,
  status: {
    type: String,
    enum: ['online', 'offline', 'error'],
    default: 'offline'
  },
  playlists: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: "Playlist",
  default: null
}]
,
  lastSeen: {
    type: Date,
    default: Date.now
  },
  registeredAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Device', deviceSchema);