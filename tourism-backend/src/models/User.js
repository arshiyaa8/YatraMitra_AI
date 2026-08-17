const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { encrypt, decrypt } = require("../utils/crypto");

// Health/allergy data is sensitive personal data under India's DPDP Act, 2023 (report §3, problem 7).
// It is strictly opt-in, stored encrypted at rest, and never used beyond recommendation purposes.
const HealthProfileSchema = new mongoose.Schema(
  {
    optedIn: { type: Boolean, default: false },
    encryptedPayload: { type: String, default: null }, // AES-encrypted JSON: { allergies, conditions, mobilityNeeds, notes }
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    preferredLanguage: { type: String, default: "en" },

    preferences: {
      interests: [{ type: String }], // e.g. ["heritage", "food", "wildlife", "adventure"]
      accessibilityNeeds: [{ type: String }], // subset of ACCESSIBILITY_TAGS
    },

    // Strictly opt-in, encrypted. See DPDP-compliant handling in healthController.
    healthProfile: { type: HealthProfileSchema, default: () => ({}) },

    savedDestinations: [{ type: mongoose.Schema.Types.ObjectId, ref: "Monument" }],

    role: { type: String, enum: ["tourist", "admin", "data_curator"], default: "tourist" },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Helpers to set/get health data transparently encrypted — never stored in plaintext.
UserSchema.methods.setHealthData = function (data) {
  this.healthProfile.optedIn = true;
  this.healthProfile.encryptedPayload = encrypt(JSON.stringify(data));
};

UserSchema.methods.getHealthData = function () {
  if (!this.healthProfile?.optedIn || !this.healthProfile?.encryptedPayload) return null;
  try {
    return JSON.parse(decrypt(this.healthProfile.encryptedPayload));
  } catch {
    return null;
  }
};

UserSchema.methods.clearHealthData = function () {
  this.healthProfile.optedIn = false;
  this.healthProfile.encryptedPayload = null;
};

module.exports = mongoose.model("User", UserSchema);
