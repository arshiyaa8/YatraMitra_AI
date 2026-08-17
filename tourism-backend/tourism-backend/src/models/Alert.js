const mongoose = require("mongoose");
const { DISASTER_ALERT_TYPES } = require("../config/constants");

// Local cache of SACHET (NDMA) CAP alerts, refreshed periodically by sachetService.
// Report §4.2: "SACHET-powered safety layer" — verified govt-sourced alerts instead of building prediction from scratch.
const AlertSchema = new mongoose.Schema(
  {
    capIdentifier: { type: String, required: true, unique: true },
    type: { type: String, enum: DISASTER_ALERT_TYPES, default: "other" },
    severity: { type: String, enum: ["extreme", "severe", "moderate", "minor", "unknown"], default: "unknown" },
    headline: String,
    description: String,
    instruction: String,
    areaDescription: String,
    language: { type: String, default: "en" },
    effective: Date,
    expires: Date,
    sourceUrl: String,
    // Optional geofence if the CAP feed provides a polygon/circle (kept as raw string; parsed on demand)
    rawArea: String,
  },
  { timestamps: true }
);

AlertSchema.index({ expires: 1 }, { expireAfterSeconds: 0 }); // auto-purge expired alerts

module.exports = mongoose.model("Alert", AlertSchema);
