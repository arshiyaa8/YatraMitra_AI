require("dotenv").config();
const path = require("path");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Festival = require("../models/Festival");

/**
 * Imports a year's curated festival calendar (src/data/festivals-<year>.json) into MongoDB.
 *
 * WHY A CURATED JSON FILE INSTEAD OF A LIVE API:
 * There is no reliable free public API for Indian festival dates — most Hindu/Islamic/Sikh/Jain
 * festivals are lunar/lunisolar and shift every Gregorian year, and moon-sighting-based dates
 * (Eid) can only be confirmed close to the date itself. The dataset here was compiled from
 * multiple 2026 panchang/festival-calendar sources (see the `_meta.sources` field in the JSON)
 * and should be re-verified/regenerated each year — this script is written to make that a
 * one-file, one-command operation.
 *
 * USAGE:
 *   node src/importers/importFestivals.js                 # imports src/data/festivals-2026.json
 *   node src/importers/importFestivals.js 2027             # imports src/data/festivals-2027.json (once you add it)
 */

async function importFestivals(year) {
  const filePath = path.join(__dirname, "..", "data", `festivals-${year}.json`);
  let dataset;
  try {
    dataset = require(filePath);
  } catch (e) {
    throw new Error(
      `No festival dataset found for ${year} at ${filePath}. Add one (copy festivals-2026.json as a template, update dates from a current panchang source).`
    );
  }

  const { festivals } = dataset;
  let upserted = 0;

  for (const f of festivals) {
    await Festival.findOneAndUpdate(
      { name: f.name, year },
      {
        name: f.name,
        date: new Date(f.date),
        endDate: f.endDate ? new Date(f.endDate) : undefined,
        type: f.type,
        states: f.states,
        touristImpact: f.touristImpact,
        notes: f.notes,
        year,
      },
      { upsert: true, new: true }
    );
    upserted += 1;
  }

  return { year, upserted, total: festivals.length };
}

if (require.main === module) {
  const year = Number(process.argv[2]) || 2026;
  (async () => {
    await connectDB();
    console.log(`Importing festival calendar for ${year}...`);
    const result = await importFestivals(year);
    console.log(`✅ Imported ${result.upserted}/${result.total} festivals for ${result.year}.`);
    await mongoose.connection.close();
    process.exit(0);
  })().catch((err) => {
    console.error("❌ Festival import failed:", err.message);
    process.exit(1);
  });
}

module.exports = { importFestivals };
