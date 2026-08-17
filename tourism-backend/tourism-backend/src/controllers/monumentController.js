const Monument = require("../models/Monument");
const { ApiError, asyncHandler } = require("../utils/apiError");

// Layer 1 (Foundation) — monument/heritage database. See report §2 for the merged-dataset sourcing strategy.

exports.listMonuments = asyncHandler(async (req, res) => {
  const { state, category, underexplored, search, page = 1, limit = 20 } = req.query;
  const query = {};
  if (state) query.state = new RegExp(`^${state}$`, "i");
  if (category) query.category = category;
  if (underexplored === "true") query.isUnderexplored = true;
  if (search) query.$text = { $search: search };

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Monument.find(query).select("-heritageArchive -translations").skip(skip).limit(Number(limit)),
    Monument.countDocuments(query),
  ]);

  res.json({ success: true, count: items.length, total, page: Number(page), data: items });
});

exports.getNearby = asyncHandler(async (req, res) => {
  const { lat, lng, radiusKm = 25 } = req.query;
  if (!lat || !lng) throw new ApiError(400, "lat and lng query params are required");

  const items = await Monument.find({
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: Number(radiusKm) * 1000,
      },
    },
  }).select("-heritageArchive -translations");

  res.json({ success: true, count: items.length, data: items });
});

exports.getMonument = asyncHandler(async (req, res) => {
  const monument = await Monument.findOne({ slug: req.params.slug }).populate(
    "heritageArchive.contributedBy",
    "name"
  );
  if (!monument) throw new ApiError(404, "Monument not found");

  // If a language is requested and a translation exists, surface it alongside the base record + its support tier
  const lang = req.query.lang;
  let translation = null;
  if (lang) {
    translation = monument.translations.find((t) => t.lang === lang) || null;
  }

  res.json({ success: true, data: monument, translation });
});

exports.createMonument = asyncHandler(async (req, res) => {
  const monument = await Monument.create(req.body);
  res.status(201).json({ success: true, data: monument });
});

exports.updateMonument = asyncHandler(async (req, res) => {
  const monument = await Monument.findOneAndUpdate({ slug: req.params.slug }, req.body, {
    new: true,
    runValidators: true,
  });
  if (!monument) throw new ApiError(404, "Monument not found");
  res.json({ success: true, data: monument });
});

exports.deleteMonument = asyncHandler(async (req, res) => {
  const monument = await Monument.findOneAndDelete({ slug: req.params.slug });
  if (!monument) throw new ApiError(404, "Monument not found");
  res.json({ success: true, message: "Monument deleted" });
});

// Digital heritage preservation (report §4.5) — add recorded oral history / local-guide narration
exports.addHeritageArchiveEntry = asyncHandler(async (req, res) => {
  const monument = await Monument.findOne({ slug: req.params.slug });
  if (!monument) throw new ApiError(404, "Monument not found");

  const { title, narratorName, audioUrl, transcript, language } = req.body;
  monument.heritageArchive.push({
    title,
    narratorName,
    audioUrl,
    transcript,
    language,
    contributedBy: req.user._id,
  });
  await monument.save();

  res.status(201).json({ success: true, data: monument.heritageArchive.at(-1) });
});

/**
 * Offline sync package (report §3, problem 8): bundles descriptions, dos-and-don'ts, and safety
 * basics for a set of monuments so the mobile client can cache them for low-connectivity heritage sites.
 * Map tiles themselves are handled client-side (Mapbox/Leaflet offline region download), not here.
 */
exports.getOfflinePackage = asyncHandler(async (req, res) => {
  const { slugs } = req.body; // array of monument slugs the user has planned a route through
  if (!Array.isArray(slugs) || slugs.length === 0) {
    throw new ApiError(400, "Provide a non-empty array of monument slugs");
  }

  const monuments = await Monument.find({ slug: { $in: slugs } }).select(
    "name slug state shortDescription history lawsAndEtiquette accessibility timings location translations"
  );

  res.json({
    success: true,
    generatedAt: new Date().toISOString(),
    count: monuments.length,
    data: monuments,
  });
});
