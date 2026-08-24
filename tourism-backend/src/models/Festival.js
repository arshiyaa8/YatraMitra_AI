/**
 * Festival.js — Cultural, Harvest & Religious Festival Calendar Schema
 *
 * Stores multi-day festival schedules, regional scope (state vs national),
 * and tourist footfall impact weights used by the crowd prediction and planning engines.
 */

const mongoose = require("mongoose");

const FestivalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    date: { type: Date, required: true, index: true },
    endDate: { type: Date }, // Optional end date for multi-day celebrations
    type: {
      type: String,
      enum: ["national", "religious", "harvest", "cultural", "pilgrimage"],
      default: "religious",
    },
    states: [{ type: String }], // Array of state names or ["ALL"] for nationwide events
    touristImpact: { type: String, enum: ["low", "medium", "high", "very_high"], default: "medium" },
    notes: String,
    year: { type: Number, required: true, index: true }, // Source calendar year
  },
  { timestamps: true }
);

// Compound index for efficient temporal and regional event queries
FestivalSchema.index({ year: 1, states: 1 });

module.exports = mongoose.model("Festival", FestivalSchema);
