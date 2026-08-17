// Priority languages: "full" = actively supported/QA'd, "best_effort" = Bhashini-covered but unverified.
// This powers the "transparent language-support tiering" innovation from the report (section 4.6).
const LANGUAGE_SUPPORT_TIERS = {
  hi: { name: "Hindi", tier: "full" },
  en: { name: "English", tier: "full" },
  ta: { name: "Tamil", tier: "full" },
  te: { name: "Telugu", tier: "full" },
  kn: { name: "Kannada", tier: "full" },
  mr: { name: "Marathi", tier: "full" },
  bn: { name: "Bengali", tier: "full" },
  gu: { name: "Gujarati", tier: "full" },
  ml: { name: "Malayalam", tier: "best_effort" },
  pa: { name: "Punjabi", tier: "best_effort" },
  or: { name: "Odia", tier: "best_effort" },
  as: { name: "Assamese", tier: "best_effort" },
  ur: { name: "Urdu", tier: "best_effort" },
  kok: { name: "Konkani", tier: "best_effort" },
  brx: { name: "Bodo", tier: "best_effort" },
};

const CROWD_LEVELS = ["low", "moderate", "high", "very_high"];

const DISASTER_ALERT_TYPES = ["flood", "cyclone", "landslide", "forest_fire", "earthquake", "other"];

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
