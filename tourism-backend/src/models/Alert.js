/**
 * Alert.js — National Disaster Management Early Warning & Safety Alert Schema
 *
 * Persists Common Alerting Protocol (CAP) feeds ingested from NDMA's SACHET network.
 * Features an automated MongoDB TTL index to auto-purge expired alerts.
 */

const mongoose = require("mongoose");
const { DISASTER_ALERT_TYPES } = require("../config/constants");

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
    rawArea: String, // Geospatial polygon / circle boundary string if provided by CAP feed
  },
  { timestamps: true }
);

// TTL index: Automatically deletes alert documents when expires timestamp is passed
AlertSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Alert", AlertSchema);
