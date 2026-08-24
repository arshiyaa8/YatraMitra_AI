const lawsData = require("../data/laws-data.json");
const { asyncHandler, ApiError } = require("../utils/apiError");

/**
 * GET /api/laws
 * Query parameters:
 *  - state (optional): Filter details for a specific state
 */
exports.getLaws = asyncHandler(async (req, res) => {
  const { state } = req.query;

  const availableStates = Object.keys(lawsData.states || {}).sort();

  if (!state) {
    return res.json({
      success: true,
      disclaimer: lawsData.disclaimer,
      nationalLaws: lawsData.nationalLaws,
      generalCulture: lawsData.generalCulture,
      generalFood: lawsData.generalFood,
      availableStates,
    });
  }

  // Case-insensitive state lookup
  const matchedStateKey = availableStates.find(
    (s) => s.toLowerCase() === state.trim().toLowerCase()
  );

  if (!matchedStateKey) {
    return res.json({
      success: true,
      state: state.trim(),
      hasSpecificData: false,
      message: `No state-specific notes recorded yet for "${state}". Showing general national guidelines.`,
      disclaimer: lawsData.disclaimer,
      nationalLaws: lawsData.nationalLaws,
      generalCulture: lawsData.generalCulture,
      generalFood: lawsData.generalFood,
      availableStates,
    });
  }

  const stateInfo = lawsData.states[matchedStateKey];

  res.json({
    success: true,
    state: matchedStateKey,
    hasSpecificData: true,
    disclaimer: lawsData.disclaimer,
    laws: stateInfo.laws || [],
    culture: stateInfo.culture || "",
    food: stateInfo.food || "",
    nationalLaws: lawsData.nationalLaws,
    generalCulture: lawsData.generalCulture,
    generalFood: lawsData.generalFood,
    availableStates,
  });
});
