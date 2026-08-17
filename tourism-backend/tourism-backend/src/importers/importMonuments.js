require("dotenv").config();
const path = require("path");
const axios = require("axios");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Monument = require("../models/Monument");

/**
 * TWO IMPORT MODES, matching the report's recommended sourcing strategy (§2, Monument/heritage data):
 * "combine the Indian Culture Portal, Bhuvan's heritage/monument layer, and Wikidata, then maintain
 *  it yourselves rather than depending on a live ASI feed."
 *
 * 1. importCuratedSeed()  — loads src/data/monuments-seed.json (hand-verified real monuments with
 *    correct coordinates/ASI status). This is the fast, reliable path and what `npm run seed` uses.
 *
 * 2. importFromWikidata(stateName) — runs a live SPARQL query against Wikidata's public endpoint to
 *    pull additional ASI-protected/heritage monuments for a given Indian state, with coordinates and
 *    ASI reference IDs. Wikidata is the one source in the report's landscape that has genuinely free,
 *    queryable, structured data — this is the closest thing to a "live feed" that's actually reliable,
 *    which is why the report recommends it as one of the three merge sources.
 *
 * USAGE:
 *   node src/importers/importMonuments.js seed
 *   node src/importers/importMonuments.js wikidata "Rajasthan"
 *   node src/importers/importMonuments.js wikidata "Rajasthan,Kerala,Odisha"
 */

const WIKIDATA_SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function importCuratedSeed() {
  const filePath = path.join(__dirname, "..", "data", "monuments-seed.json");
  const monuments = require(filePath);

  let upserted = 0;
  for (const m of monuments) {
    await Monument.findOneAndUpdate(
      { slug: m.slug },
      {
        name: m.name,
        slug: m.slug,
        state: m.state,
        district: m.district,
        category: m.category,
        isUnderexplored: !!m.isUnderexplored,
        location: { type: "Point", coordinates: m.coordinates },
        asiProtected: !!m.asiProtected,
        shortDescription: m.shortDescription,
        eTicketingAvailable: !!m.eTicketingAvailable,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    upserted += 1;
  }

  return { mode: "curated_seed", upserted, total: monuments.length };
}

/**
 * Builds a SPARQL query for heritage structures / monuments located in a given Indian state,
 * that have coordinate data (P625) — required to plot them on the map / do geo queries.
 * Filters loosely on instance-of (P31) heritage-related classes to avoid pulling in unrelated items.
 */
function buildSparqlQuery(stateName) {
  return `
    SELECT ?item ?itemLabel ?coord ?asiId WHERE {
      ?item wdt:P131* ?adminArea .
      ?adminArea rdfs:label "${stateName}"@en .
      ?item wdt:P625 ?coord .
      VALUES ?type { wd:Q839954 wd:Q1621766 wd:Q16560 wd:Q44613 wd:Q23413 wd:Q483110 wd:Q2065 } .
      ?item wdt:P31 ?type .
      OPTIONAL { ?item wdt:P3711 ?asiId. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    LIMIT 100
  `;
}

async function importFromWikidata(stateNamesCsv) {
  const states = stateNamesCsv.split(",").map((s) => s.trim()).filter(Boolean);
  let totalUpserted = 0;
  const perState = {};

  for (const state of states) {
    const query = buildSparqlQuery(state);
    let data;
    try {
      const resp = await axios.get(WIKIDATA_SPARQL_ENDPOINT, {
        params: { query, format: "json" },
        headers: { "User-Agent": "TourismAssistantSIH/1.0 (educational hackathon project)" },
        timeout: 30000,
      });
      data = resp.data;
    } catch (e) {
      console.warn(`⚠️  Wikidata query failed for "${state}": ${e.message}`);
      perState[state] = { error: e.message };
      continue;
    }

    const rows = data?.results?.bindings || [];
    let upsertedForState = 0;

    for (const row of rows) {
      const name = row.itemLabel?.value;
      if (!name || /^Q\d+$/.test(name)) continue; // skip unlabeled items (raw QIDs)

      const coordMatch = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(row.coord?.value || "");
      if (!coordMatch) continue;
      const [, lng, lat] = coordMatch;

      const slug = slugify(name);
      const asiId = row.asiId?.value || undefined;

      try {
        await Monument.findOneAndUpdate(
          { slug },
          {
            $setOnInsert: {
              name,
              slug,
              state,
              category: "monument",
              shortDescription: `Heritage site in ${state}, imported from Wikidata.`,
              location: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
              asiProtected: !!asiId,
              "sourceRefs.wikidataId": row.item?.value?.split("/").pop(),
              "sourceRefs.asiListId": asiId,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        upsertedForState += 1;
      } catch (e) {
        // Duplicate slug or validation issue — log and continue rather than aborting the whole batch
        console.warn(`  skipped "${name}": ${e.message}`);
      }
    }

    perState[state] = { found: rows.length, upserted: upsertedForState };
    totalUpserted += upsertedForState;
    // Be polite to the shared public Wikidata endpoint between states
    await new Promise((r) => setTimeout(r, 1000));
  }

  return { mode: "wikidata", totalUpserted, perState };
}

if (require.main === module) {
  const [, , mode, arg] = process.argv;

  (async () => {
    await connectDB();

    if (mode === "seed") {
      const result = await importCuratedSeed();
      console.log(`✅ Curated seed import: ${result.upserted}/${result.total} monuments upserted.`);
    } else if (mode === "wikidata") {
      if (!arg) {
        console.error('Usage: node src/importers/importMonuments.js wikidata "StateName[,StateName2,...]"');
        process.exit(1);
      }
      console.log(`Querying Wikidata for: ${arg} (this hits the public endpoint — may take a while)...`);
      const result = await importFromWikidata(arg);
      console.log(`✅ Wikidata import complete. Total upserted: ${result.totalUpserted}`);
      console.log(JSON.stringify(result.perState, null, 2));
    } else {
      console.error('Usage:\n  node src/importers/importMonuments.js seed\n  node src/importers/importMonuments.js wikidata "Rajasthan"');
      process.exit(1);
    }

    await mongoose.connection.close();
    process.exit(0);
  })().catch((err) => {
    console.error("❌ Monument import failed:", err.message);
    process.exit(1);
  });
}

module.exports = { importCuratedSeed, importFromWikidata };
