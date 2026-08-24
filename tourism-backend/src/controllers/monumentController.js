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

/**
 * AI Monument Assistant Q&A:
 * Answers visitor questions grounded in verified factual data for this monument (timings, tickets, accessibility, rules, food, history).
 */
exports.askMonumentQuestion = asyncHandler(async (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== "string") {
    throw new ApiError(400, "Question is required");
  }

  const monument = await Monument.findOne({ slug: req.params.slug });
  if (!monument) throw new ApiError(404, "Monument not found");

  const q = question.toLowerCase();
  let answer = "";
  let category = "general";

  const timings = monument.timings || {};
  const fee = monument.entryFee || {};
  const acc = monument.accessibility || {};
  const rules = monument.lawsAndEtiquette || [];
  const food = monument.foodNearby || [];

  // 1. Timings & Hours
  if (/timing|hour|open|close|when|time|schedule|holiday|closed|morning|evening|night/i.test(q)) {
    category = "timings";
    const openClose = timings.openTime && timings.closeTime ? `open from ${timings.openTime} to ${timings.closeTime}` : "open during daytime hours";
    const closedDays = (timings.closedOn || []).length > 0 ? `It is closed on ${timings.closedOn.join(", ")}.` : "It is open on all days of the week.";
    const bestTime = timings.bestVisitTimeOfDay ? `Recommended time of day: ${timings.bestVisitTimeOfDay}.` : "";
    const bestMonths = (timings.bestVisitMonths || []).length > 0 ? `Best visiting season: ${timings.bestVisitMonths.join(", ")}.` : "";
    answer = `${monument.name} is ${openClose}. ${closedDays} ${bestTime} ${bestMonths}`.trim();
  }
  // 2. Ticket & Entry Fee
  else if (/ticket|fee|entry|cost|price|pay|rate|charge|rupee|inr|free|money/i.test(q)) {
    category = "entry_fee";
    const curr = fee.currency || "INR";
    const indianFee = fee.indian === 0 ? "free of charge" : fee.indian !== undefined ? `${curr} ${fee.indian}` : "standard rates";
    const foreignFee = fee.foreigner === 0 ? "free of charge" : fee.foreigner !== undefined ? `${curr} ${fee.foreigner}` : "standard rates";
    answer = `Entry fee for ${monument.name}: Indian visitors: ${indianFee}; Foreign tourists: ${foreignFee}.`;
  }
  // 3. Accessibility & Wheelchair
  else if (/wheelchair|access|ramp|elder|disabled|differently|handicap|blind|braille|step|cart|walk/i.test(q)) {
    category = "accessibility";
    const tags = (acc.tags || []).map((t) => t.replaceAll("_", " "));
    const notes = acc.wcagNotes ? ` Additional notes: ${acc.wcagNotes}` : "";
    if (tags.length > 0) {
      answer = `Accessibility features at ${monument.name} include: ${tags.join(", ")}.${notes}`;
    } else {
      answer = `Standard pathways are available at ${monument.name}.${notes || " Please check on-site with ASI staff for mobility assistance."}`;
    }
  }
  // 4. Photography, Camera, Drones, Rules & Etiquette
  else if (/photo|camera|drone|video|shoot|rule|dos|dont|allowed|permit|prohibit|ban|smoke|shoe|dress/i.test(q)) {
    category = "rules";
    if (rules.length > 0) {
      answer = `Key rules and visitor etiquette for ${monument.name}:\n• ` + rules.join("\n• ");
    } else {
      answer = `Standard ASI heritage protection rules apply at ${monument.name}. Commercial shoots and drones require prior government clearance.`;
    }
  }
  // 5. Food & Nearby Dining
  else if (/food|eat|restaurant|dish|famous|snack|taste|sweet|chaat|meal|drink|lunch/i.test(q)) {
    category = "food";
    if (food.length > 0) {
      answer = `Famous regional delicacies and specialties near ${monument.name}: ${food.join(", ")}.`;
    } else {
      answer = `Local street food and regional delicacies are available in the surrounding town and markets near ${monument.name}.`;
    }
  }
  // 6. History, Origin, Ruler, Architecture
  else if (/history|who built|when built|century|ruler|emperor|king|dynasty|architect|story|significance/i.test(q)) {
    category = "history";
    const historyText = monument.history || monument.shortDescription || "";
    const significance = monument.culturalSignificance ? ` Cultural Significance: ${monument.culturalSignificance}` : "";
    answer = `${monument.name}: ${historyText}${significance}`;
  }
  // 7. General Inquiry / Overview
  else {
    category = "general";
    answer = `${monument.name} is a renowned ${monument.category || "heritage site"} in ${monument.state}${monument.district ? `, ${monument.district}` : ""}. ${monument.shortDescription} ${monument.culturalSignificance || ""}`.trim();
  }

  res.json({
    success: true,
    monument: monument.name,
    slug: monument.slug,
    category,
    question,
    answer,
  });
});
