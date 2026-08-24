/**
 * User.js — User Account & DPDP-Compliant Encrypted Profile Schema
 *
 * Manages identity credentials, hashed passwords (bcrypt), travel preferences,
 * saved bookmark itineraries, and AES-256 encrypted personal health disclosures.
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { encrypt, decrypt } = require("../utils/crypto");

/**
 * Embedded Sub-Schema for Privacy-Protected Health & Mobility Information
 * Complies with the Digital Personal Data Protection (DPDP) Act, 2023.
 */
const HealthProfileSchema = new mongoose.Schema(
  {
    optedIn: { type: Boolean, default: false },
    encryptedPayload: { type: String, default: null }, // AES-256 encrypted JSON payload
  },
  { _id: false }
);

/**
 * Main User Identity Schema
 */
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    preferredLanguage: { type: String, default: "en" },

    preferences: {
      interests: [{ type: String }], // e.g. ["heritage", "food", "wildlife", "adventure"]
      accessibilityNeeds: [{ type: String }], // e.g. ["wheelchair_accessible", "step_free_access"]
    },

    healthProfile: { type: HealthProfileSchema, default: () => ({}) },
    savedDestinations: [{ type: mongoose.Schema.Types.ObjectId, ref: "Monument" }],
    role: { type: String, enum: ["tourist", "admin", "data_curator"], default: "tourist" },
  },
  { timestamps: true }
);

/**
 * Pre-save hook: Automatically hashes password before persisting if modified
 */
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

/**
 * Compares candidate plain password with stored bcrypt hash
 *
 * @param {string} candidate - Plaintext password to test
 * @returns {Promise<boolean>} Match result
 */
UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

/**
 * Encrypts and stores personal health disclosures
 *
 * @param {Object} data - Health profile object { allergies, conditions, mobilityNeeds, notes }
 */
UserSchema.methods.setHealthData = function (data) {
  this.healthProfile.optedIn = true;
  this.healthProfile.encryptedPayload = encrypt(JSON.stringify(data));
};

/**
 * Decrypts and returns personal health data in plaintext
 *
 * @returns {Object|null} Decrypted health profile object or null
 */
UserSchema.methods.getHealthData = function () {
  if (!this.healthProfile?.optedIn || !this.healthProfile?.encryptedPayload) return null;
  try {
    return JSON.parse(decrypt(this.healthProfile.encryptedPayload));
  } catch {
    return null;
  }
};

/**
 * Purges encrypted health data and resets opt-in consent flag
 */
UserSchema.methods.clearHealthData = function () {
  this.healthProfile.optedIn = false;
  this.healthProfile.encryptedPayload = null;
};

module.exports = mongoose.model("User", UserSchema);
