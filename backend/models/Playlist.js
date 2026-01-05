const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  items: [{
    media: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media'
    },
    duration: {
      type: Number,
      default: 10
    },
    order: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Playlist', playlistSchema);