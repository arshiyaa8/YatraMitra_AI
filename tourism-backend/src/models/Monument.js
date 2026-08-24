/**
 * Monument.js — Indian Heritage Site & Monument Catalog Schema
 *
 * Sourced from curated ASI listings, Indian Culture Portal, and Bhuvan Geo-Heritage GIS.
 * Includes geospatial coordinates (2dsphere index for radius queries), multilingual
 * translations, accessibility tags, seasonal timings, ticketing, and oral history archives.
 */

const mongoose = require("mongoose");

/**
 * Embedded Sub-Schema for Localized Translations & Verified Indic Scripts
 */
const TranslationSchema = new mongoose.Schema(
  {
    lang: { type: String, required: true }, // ISO language code (e.g. 'hi', 'ta', 'te')
    name: String,
    shortDescription: String,
    history: String,
    dosAndDonts: [String],
    supportTier: { type: String, enum: ["full", "best_effort", "machine_only"], default: "machine_only" },
  },
  { _id: false }
);

/**
 * Main Heritage Monument & Destination Schema
 */
const MonumentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    slug: { type: String, required: true, unique: true },
    state: { type: String, required: true, index: true },
    district: String,
    category: { type: String, enum: ["monument", "temple", "fort", "museum", "natural", "wildlife", "other"], default: "monument" },
    isUnderexplored: { type: Boolean, default: false }, // Powers undiscovered hidden gem recommendations

    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // GeoJSON format: [longitude, latitude]
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
      tags: [{ type: String }], // Subset of ACCESSIBILITY_TAGS enum
      wcagNotes: String,
    },

    entryFee: {
      indian: Number,
      foreigner: Number,
      currency: { type: String, default: "INR" },
    },

    timings: {
      openTime: String, // e.g. "06:00"
      closeTime: String, // e.g. "18:00"
      closedOn: [String], // e.g. ["Monday"]
      bestVisitMonths: [String],
      bestVisitTimeOfDay: String,
    },

    eTicketingAvailable: { type: Boolean, default: false },
    translations: [TranslationSchema],

    // Digital Heritage Preservation Archive: Community and guide audio narrations
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

// ── Geospatial & Full-Text Search Indexes ──────────────────────────
MonumentSchema.index({ location: "2dsphere" });
MonumentSchema.index({ name: "text", shortDescription: "text", state: "text" });

module.exports = mongoose.model("Monument", MonumentSchema);
