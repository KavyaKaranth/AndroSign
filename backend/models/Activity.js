const mongoose = require("mongoose");

const ActivitySchema = new mongoose.Schema({
  type: String,
  message: String,
  time: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Activity", ActivitySchema);
