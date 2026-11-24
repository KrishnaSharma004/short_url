const mongoose = require("mongoose");

const urlSchema = new mongoose.Schema(
  {
    shortCode: { type: String, required: true, unique: true, index: true },
    originalUrl: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    isCustomAlias: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
    // Denormalised counter so the dashboard list does not need to aggregate clicks.
    clickCount: { type: Number, default: 0 },
    // ML threat assessment made when the link was created (see services/threatService.js).
    riskScore: { type: Number, default: 0 },
    riskLevel: { type: String, enum: ["safe", "suspicious"], default: "safe" },
    // Topic label: keyword heuristic at creation, refined by the LLM when an API key is configured.
    category: { type: String, default: "Other" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Url", urlSchema);
