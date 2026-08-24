/**
 * constants.js — Application-Wide Enums and System Configuration Constants
 *
 * Defines centralized configuration maps and enum domains shared across
 * controllers, validation layers, and database schemas.
 */

/**
 * Language Support Registry
 * Maps ISO language codes to their human-readable localized names, support tiers,
 * and geographic classifications (global vs. Indian scheduled languages).
 *
 * - "full": End-to-end verified translation, TTS, and UI localization.
 * - "best_effort": Algorithmic fallback support via machine translation pipeline.
 */
const LANGUAGE_SUPPORT_TIERS = {
  // Global / International Languages
  en: { name: "English", tier: "full", region: "global" },
  es: { name: "Spanish (Español)", tier: "best_effort", region: "foreign" },
  fr: { name: "French (Français)", tier: "best_effort", region: "foreign" },
  de: { name: "German (Deutsch)", tier: "best_effort", region: "foreign" },
  ja: { name: "Japanese (日本語)", tier: "best_effort", region: "foreign" },
  zh: { name: "Mandarin Chinese (中文)", tier: "best_effort", region: "foreign" },
  ru: { name: "Russian (Русский)", tier: "best_effort", region: "foreign" },
  ar: { name: "Arabic (العربية)", tier: "best_effort", region: "foreign" },
  pt: { name: "Portuguese (Português)", tier: "best_effort", region: "foreign" },
  it: { name: "Italian (Italiano)", tier: "best_effort", region: "foreign" },
  ko: { name: "Korean (한국어)", tier: "best_effort", region: "foreign" },

  // Scheduled & Regional Indian Languages
  hi: { name: "Hindi (हिन्दी)", tier: "full", region: "indian" },
  ta: { name: "Tamil (தமிழ்)", tier: "full", region: "indian" },
  te: { name: "Telugu (తెలుగు)", tier: "full", region: "indian" },
  kn: { name: "Kannada (ಕನ್ನಡ)", tier: "full", region: "indian" },
  mr: { name: "Marathi (मराठी)", tier: "full", region: "indian" },
  bn: { name: "Bengali (বাংলা)", tier: "full", region: "indian" },
  gu: { name: "Gujarati (ગુજરાતી)", tier: "full", region: "indian" },
  ml: { name: "Malayalam (മലയാളം)", tier: "best_effort", region: "indian" },
  pa: { name: "Punjabi (ਪੰਜਾਬੀ)", tier: "best_effort", region: "indian" },
  or: { name: "Odia (ଓଡ଼ିଆ)", tier: "best_effort", region: "indian" },
  as: { name: "Assamese (অসমীয়া)", tier: "best_effort", region: "indian" },
  ur: { name: "Urdu (اردو)", tier: "best_effort", region: "indian" },
  kok: { name: "Konkani (कोंकणी)", tier: "best_effort", region: "indian" },
  brx: { name: "Bodo (बड़ो)", tier: "best_effort", region: "indian" },
};

/**
 * Standardized crowd density buckets used for reporting and ML estimates
 */
const CROWD_LEVELS = ["low", "moderate", "high", "very_high"];

/**
 * Weather & disaster classification types aligned with SACHET (NDMA) taxonomy
 */
const DISASTER_ALERT_TYPES = ["flood", "cyclone", "landslide", "forest_fire", "earthquake", "other"];

/**
 * Recognized physical & sensory accessibility features for monument filtering
 */
const ACCESSIBILITY_TAGS = [
  "wheelchair_accessible",
  "elderly_friendly",
  "audio_guide_available",
  "braille_signage",
  "step_free_access",
  "rest_areas_available",
];

module.exports = {
  LANGUAGE_SUPPORT_TIERS,
  CROWD_LEVELS,
  DISASTER_ALERT_TYPES,
  ACCESSIBILITY_TAGS,
};
