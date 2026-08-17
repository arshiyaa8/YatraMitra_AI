const { asyncHandler } = require("../utils/apiError");

// Report §2/§3 (Health/allergy personalization, problem 7): strictly opt-in, encrypted at rest,
// used only for the stated recommendation purpose, aligned with India's DPDP Act 2023.

exports.setHealthProfile = asyncHandler(async (req, res) => {
  const { allergies = [], conditions = [], mobilityNeeds = [], notes = "" } = req.body;
  req.user.setHealthData({ allergies, conditions, mobilityNeeds, notes });
  await req.user.save();
  res.json({ success: true, message: "Health profile saved (encrypted, opt-in).", optedIn: true });
});

exports.getHealthProfile = asyncHandler(async (req, res) => {
  const data = req.user.getHealthData();
  res.json({ success: true, optedIn: !!req.user.healthProfile?.optedIn, data });
});

exports.clearHealthProfile = asyncHandler(async (req, res) => {
  req.user.clearHealthData();
  await req.user.save();
  res.json({ success: true, message: "Health profile cleared.", optedIn: false });
});

/**
 * Generates simple, non-diagnostic recommendation flags from opted-in health data —
 * e.g. surfacing accessibility tags on monuments, or flagging food recommendations to avoid.
 * This never leaves the server as raw health data; only derived flags are returned.
 */
exports.getRecommendationFlags = asyncHandler(async (req, res) => {
  const data = req.user.getHealthData();
  if (!data) {
    return res.json({ success: true, flags: [], message: "No health profile on file (opt-in required)." });
  }

  const flags = [];
  if (data.mobilityNeeds?.length) flags.push("prefer_wheelchair_accessible_sites");
  if (data.allergies?.length) flags.push("filter_food_recommendations_by_allergy");
  if (data.conditions?.some((c) => /heat|heart|asthma|respiratory/i.test(c))) {
    flags.push("avoid_high_heat_high_exertion_slots");
  }

  res.json({ success: true, flags });
});
