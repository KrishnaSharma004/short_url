const mongoose = require("mongoose");

// One document per click. Kept out of the Url document so it never grows unbounded.
const clickSchema = new mongoose.Schema({
  url: { type: mongoose.Schema.Types.ObjectId, ref: "Url", required: true },
  shortCode: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  day: { type: String, required: true }, // YYYY-MM-DD (UTC), makes per-day grouping cheap
  referrer: { type: String, default: "Direct" },
  browser: { type: String, default: "Unknown" },
  os: { type: String, default: "Unknown" },
  device: { type: String, default: "desktop" },
});

clickSchema.index({ url: 1, timestamp: -1 });

module.exports = mongoose.model("Click", clickSchema);
