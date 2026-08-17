const mongoose = require("mongoose");

// Populated by src/importers/importFestivals.js from src/data/festivals-*.json.
// Drives the "best time to visit" / crowd-prediction festival bump in crowdService,
// and can independently power a "festivals near you" tourism-promotion feature.
const FestivalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    date: { type: Date, required: true, index: true },
    endDate: { type: Date }, // for multi-day festivals; defaults to `date` if absent
    type: {
      type: String,
      enum: ["national", "religious", "harvest", "cultural", "pilgrimage"],
      default: "religious",
    },
    states: [{ type: String }], // ["ALL"] means nationwide relevance
    touristImpact: { type: String, enum: ["low", "medium", "high", "very_high"], default: "medium" },
    notes: String,
    year: { type: Number, required: true, index: true }, // source year — re-imported annually, dates shift
  },
  { timestamps: true }
);

FestivalSchema.index({ year: 1, states: 1 });

module.exports = mongoose.model("Festival", FestivalSchema);
