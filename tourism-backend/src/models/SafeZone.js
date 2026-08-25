/**
 * SafeZone.js — Verified Emergency Infrastructure & Safe Haven Schema
 *
 * Stores geospatial coordinates and emergency contact details for 24/7 police stations,
 * hospitals, trauma centers, verified hotels, transport hubs, and tourist facilitation booths.
 */

const mongoose = require("mongoose");

const SafeZoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["police", "hospital", "hotel", "transit", "tourist_booth"],
      required: true,
      index: true,
    },
    address: { type: String, required: true },
    city: { type: String, required: true, index: true },
    state: { type: String, required: true, index: true },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    emergencyPhone: { type: String, default: "112" },
    isOpen24x7: { type: Boolean, default: true },
    verified: { type: Boolean, default: true },
    features: [{ type: String }], // e.g. "English Speaking Staff", "Tourist Police", "Ambulance Ready", "Security Guard"
  },
  { timestamps: true }
);

// 2dsphere index for geospatial proximity queries
SafeZoneSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("SafeZone", SafeZoneSchema);
