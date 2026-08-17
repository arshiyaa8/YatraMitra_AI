const mongoose = require("mongoose");

// This is the "one curated internal dataset" recommended in the report (§2, Monument/heritage data row):
// merged from Indian Culture Portal + Bhuvan heritage layer + Wikidata + ASI listings, then maintained internally
// rather than depending on a single live ASI API (which does not exist as a clean public feed).
const TranslationSchema = new mongoose.Schema(
  {
    lang: { type: String, required: true }, // ISO code, e.g. "hi", "ta"
    name: String,
    shortDescription: String,
    history: String,
    dosAndDonts: [String],
    supportTier: { type: String, enum: ["full", "best_effort", "machine_only"], default: "machine_only" },
  },
  { _id: false }
);

const MonumentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    slug: { type: String, required: true, unique: true },
    state: { type: String, required: true, index: true },
    district: String,
    category: { type: String, enum: ["monument", "temple", "fort", "museum", "natural", "wildlife", "other"], default: "monument" },
    isUnderexplored: { type: Boolean, default: false }, // powers "promote underexplored destinations"

    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },

    asiProtected: { type: Boolean, default: false },
    asiCircle: String,
    sourceRefs: {
      indianCulturePortalId: String,
      bhuvanHeritageLayerId: String,
      wikidataId: String,
      asiListId: String,
    },

    shortDescription: { type: String, required: true },
    history: String,
    culturalSignificance: String,
    foodNearby: [String],
    lawsAndEtiquette: [String],

    accessibility: {
      tags: [{ type: String }], // subset of ACCESSIBILITY_TAGS
      wcagNotes: String,
    },

    entryFee: {
      indian: Number,
      foreigner: Number,
      currency: { type: String, default: "INR" },
    },

    timings: {
      openTime: String, // "06:00"
      closeTime: String, // "18:00"
      closedOn: [String], // e.g. ["Monday"]
      bestVisitMonths: [String],
      bestVisitTimeOfDay: String,
    },

    eTicketingAvailable: { type: Boolean, default: false }, // enables ticket-linked crowd signal

    translations: [TranslationSchema],

    // Digital heritage preservation (report §4.5): archive of recorded oral histories / local-guide narration
    heritageArchive: [
      {
        title: String,
        narratorName: String,
        audioUrl: String,
        transcript: String,
        language: String,
        contributedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    images: [String],
    averageRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

MonumentSchema.index({ location: "2dsphere" });
MonumentSchema.index({ name: "text", shortDescription: "text", state: "text" });

module.exports = mongoose.model("Monument", MonumentSchema);
