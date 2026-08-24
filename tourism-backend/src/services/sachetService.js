/**
 * sachetService.js — NDMA SACHET Common Alerting Protocol (CAP) Integration
 *
 * Ingests national disaster and meteorological warnings (floods, cyclones, landslides,
 * heatwaves) from the National Disaster Management Authority's CAP feed into MongoDB.
 */

const axios = require("axios");
const xml2js = require("xml2js");
const Alert = require("../models/Alert");
const { DISASTER_ALERT_TYPES } = require("../config/constants");

/**
 * Classifies free-form alert text into standard DISASTER_ALERT_TYPES enum.
 *
 * @param {string} text - Headline and description content
 * @returns {string} Normalized alert category ('flood', 'cyclone', 'landslide', etc.)
 */
const classifyType = (text = "") => {
  const t = text.toLowerCase();
  if (t.includes("flood")) return "flood";
  if (t.includes("cyclone")) return "cyclone";
  if (t.includes("landslide")) return "landslide";
  if (t.includes("forest fire") || t.includes("wildfire")) return "forest_fire";
  if (t.includes("earthquake")) return "earthquake";
  return "other";
};

/**
 * Pulls the SACHET CAP RSS feed and upserts alerts into the local Alert cache.
 * Intended to run on a schedule (see server.js setInterval) so alert queries stay fast/local
 * rather than hitting the government feed on every user request.
 */
async function refreshAlerts() {
  const url = process.env.SACHET_CAP_RSS_URL;
  if (!url) {
    console.warn("SACHET_CAP_RSS_URL not configured — skipping alert refresh");
    return { fetched: 0 };
  }

  const { data: xml } = await axios.get(url, { timeout: 15000 });
  const parsed = await xml2js.parseStringPromise(xml, { explicitArray: false, mergeAttrs: true });

  const items = [].concat(parsed?.rss?.channel?.item || []);
  let upserted = 0;

  for (const item of items) {
    try {
      const capIdentifier = item.guid?._ || item.guid || item.link;
      if (!capIdentifier) continue;

      const headline = item.title || "";
      const description = item.description || "";
      const type = classifyType(`${headline} ${description}`);

      await Alert.findOneAndUpdate(
        { capIdentifier },
        {
          capIdentifier,
          type,
          headline,
          description,
          areaDescription: item.category || "",
          sourceUrl: item.link,
          effective: item.pubDate ? new Date(item.pubDate) : new Date(),
          // SACHET RSS doesn't always give an explicit expiry — default alerts to a 24h TTL in our cache.
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          language: "en",
        },
        { upsert: true, new: true }
      );
      upserted += 1;
    } catch (e) {
      console.error("Failed to upsert SACHET alert item:", e.message);
    }
  }

  return { fetched: items.length, upserted };
}

/**
 * Returns cached alerts, optionally filtered by free-text area match (state/district/site name)
 * and/or type. Full geofence polygon matching is left as a roadmap item (report treats this
 * as MVP-appropriate: text/area matching first, precise polygon matching later).
 */
async function getActiveAlerts({ area, type } = {}) {
  const query = {};
  if (type && DISASTER_ALERT_TYPES.includes(type)) query.type = type;
  if (area) {
    query.$or = [
      { areaDescription: new RegExp(area, "i") },
      { headline: new RegExp(area, "i") },
      { description: new RegExp(area, "i") },
    ];
  }
  return Alert.find(query).sort({ effective: -1 }).limit(100);
}

module.exports = { refreshAlerts, getActiveAlerts };
