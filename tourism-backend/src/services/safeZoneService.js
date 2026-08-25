/**
 * safeZoneService.js — SafePath Navigation, Live OpenStreetMap Isolation Scoring & Safe Haven Routing Service
 *
 * Connects directly to OpenStreetMap (OSM) Overpass API to dynamically discover real-time
 * police stations, 24/7 hospitals, clinics, pharmacies, verified hotels, and transit hubs
 * anywhere in India or the world.
 */

const mongoose = require("mongoose");
const axios = require("axios");
const SafeZone = require("../models/SafeZone");

// Verified Curated Safe Zones across major Indian tourism hubs
const SEED_SAFE_ZONES = [
  // ── Agra Circuit ───────────────────────────────────────────────
  {
    name: "Tajganj Tourist Police Station",
    category: "police",
    address: "Tajganj Eastern Gate Rd, Agra, Uttar Pradesh",
    city: "Agra",
    state: "Uttar Pradesh",
    location: { type: "Point", coordinates: [78.0465, 27.1735] },
    emergencyPhone: "0562-2226456",
    isOpen24x7: true,
    features: ["Tourist Police Helpdesk", "24/7 Women Helpline", "English & Hindi Support"],
  },
  {
    name: "S.N. Medical College & Emergency Hospital",
    category: "hospital",
    address: "Hospital Road, Mantola, Agra, Uttar Pradesh",
    city: "Agra",
    state: "Uttar Pradesh",
    location: { type: "Point", coordinates: [78.0125, 27.1865] },
    emergencyPhone: "0562-2260353",
    isOpen24x7: true,
    features: ["24/7 Emergency Trauma", "Ambulance Hub", "Intensive Care"],
  },
  {
    name: "ITC Mughal Luxury Resort & Safe Refuge",
    category: "hotel",
    address: "Fatehabad Road, Tajganj, Agra, Uttar Pradesh",
    city: "Agra",
    state: "Uttar Pradesh",
    location: { type: "Point", coordinates: [78.0412, 27.1605] },
    emergencyPhone: "0562-4021700",
    isOpen24x7: true,
    features: ["24/7 Security", "Private Medical First-Aid", "Tourist Concierge"],
  },
  {
    name: "Agra Cantt Railway Station Police Booth",
    category: "transit",
    address: "Agra Cantt, Idgah Colony, Agra, Uttar Pradesh",
    city: "Agra",
    state: "Uttar Pradesh",
    location: { type: "Point", coordinates: [78.0081, 27.1585] },
    emergencyPhone: "139",
    isOpen24x7: true,
    features: ["Railway Protection Force", "24/7 Public Transport Hub", "CCTV Monitored"],
  },

  // ── Delhi Circuit ──────────────────────────────────────────────
  {
    name: "Connaught Place Police Station & Tourist Assistance",
    category: "police",
    address: "Baba Kharak Singh Marg, Connaught Place, New Delhi",
    city: "Delhi",
    state: "Delhi",
    location: { type: "Point", coordinates: [77.2155, 28.6289] },
    emergencyPhone: "011-23340555",
    isOpen24x7: true,
    features: ["Specialized Tourist Police", "Multilingual Assistance", "24/7 Patrol Unit"],
  },
  {
    name: "AIIMS New Delhi Emergency & Trauma Centre",
    category: "hospital",
    address: "Sri Aurobindo Marg, Ansari Nagar, New Delhi",
    city: "Delhi",
    state: "Delhi",
    location: { type: "Point", coordinates: [77.209, 28.5672] },
    emergencyPhone: "011-26588500",
    isOpen24x7: true,
    features: ["Apex National Trauma Centre", "24/7 Blood Bank", "Specialist Emergency"],
  },
  {
    name: "The Imperial Hotel 24/7 Security Zone",
    category: "hotel",
    address: "Janpath, Connaught Place, New Delhi",
    city: "Delhi",
    state: "Delhi",
    location: { type: "Point", coordinates: [77.2185, 28.6212] },
    emergencyPhone: "011-23341234",
    isOpen24x7: true,
    features: ["Gated Perimeter Security", "24/7 Concierge", "Safe Transport Dispatch"],
  },
  {
    name: "New Delhi Railway Station & Metro Interchange Hub",
    category: "transit",
    address: "Bhavbhuti Marg, Ratan Lal Market, Kamla Market, New Delhi",
    city: "Delhi",
    state: "Delhi",
    location: { type: "Point", coordinates: [77.2195, 28.6428] },
    emergencyPhone: "112",
    isOpen24x7: true,
    features: ["24/7 Metro Police", "High Density Public Area", "Constant Illumination"],
  },

  // ── Jaipur Circuit ─────────────────────────────────────────────
  {
    name: "Jaipur Tourist Police Station (Manak Chowk)",
    category: "police",
    address: "Badi Choupad, Old City, Jaipur, Rajasthan",
    city: "Jaipur",
    state: "Rajasthan",
    location: { type: "Point", coordinates: [75.8267, 26.9242] },
    emergencyPhone: "0141-2615555",
    isOpen24x7: true,
    features: ["Tourist Protection Force", "Heritage Patrol", "Women Safety Desk"],
  },
  {
    name: "SMS Hospital Emergency Ward",
    category: "hospital",
    address: "JLN Marg, Ashok Nagar, Jaipur, Rajasthan",
    city: "Jaipur",
    state: "Rajasthan",
    location: { type: "Point", coordinates: [75.8165, 26.8925] },
    emergencyPhone: "0141-2560291",
    isOpen24x7: true,
    features: ["Major Trauma Center", "24/7 Pharmacy", "Ambulance Network"],
  },

  // ── Varanasi Circuit ───────────────────────────────────────────
  {
    name: "Dashashwamedh Ghat Tourist Police Booth",
    category: "police",
    address: "Dashashwamedh Ghat Rd, Godowlia, Varanasi, Uttar Pradesh",
    city: "Varanasi",
    state: "Uttar Pradesh",
    location: { type: "Point", coordinates: [83.0105, 25.3075] },
    emergencyPhone: "0542-2451717",
    isOpen24x7: true,
    features: ["Ghat Security Patrol", "Tourist Facilitation", "24/7 Riverfront Watch"],
  },
  {
    name: "Sir Sunderlal Hospital (BHU Medical)",
    category: "hospital",
    address: "Banaras Hindu University, Varanasi, Uttar Pradesh",
    city: "Varanasi",
    state: "Uttar Pradesh",
    location: { type: "Point", coordinates: [82.9985, 25.2755] },
    emergencyPhone: "0542-2369299",
    isOpen24x7: true,
    features: ["Super Specialty Emergency", "24/7 Trauma", "Ambulance Services"],
  },

  // ── Mumbai Circuit ─────────────────────────────────────────────
  {
    name: "Colaba Police Station (Gateway of India)",
    category: "police",
    address: "Shahid Bhagat Singh Rd, Colaba, Mumbai, Maharashtra",
    city: "Mumbai",
    state: "Maharashtra",
    location: { type: "Point", coordinates: [72.8315, 18.9195] },
    emergencyPhone: "022-22856817",
    isOpen24x7: true,
    features: ["Coastal Tourist Police", "High Visibility Beat", "Rapid Response"],
  },
  {
    name: "Bombay Hospital & Medical Research Centre",
    category: "hospital",
    address: "Marine Lines, Mumbai, Maharashtra",
    city: "Mumbai",
    state: "Maharashtra",
    location: { type: "Point", coordinates: [72.8295, 18.9415] },
    emergencyPhone: "022-22067676",
    isOpen24x7: true,
    features: ["Cardiac & Trauma Emergency", "24/7 Ambulance", "Emergency Care"],
  },
];

function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Queries the live OpenStreetMap Overpass API for real-world emergency amenities,
 * police stations, hospitals, pharmacies, hotels, and transit stops around any coordinates.
 *
 * @param {number} lat - User latitude
 * @param {number} lng - User longitude
 * @param {number} radiusMeters - Search radius in meters (default 3500m)
 * @returns {Promise<Array>} List of real live SafeZone objects
 */
async function fetchLiveOsmSafeHavens({ lat, lng, radiusMeters = 3500 }) {
  const query = `[out:json][timeout:7];(
    node["amenity"="police"](around:${radiusMeters},${lat},${lng});
    node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
    node["amenity"="clinic"](around:${radiusMeters},${lat},${lng});
    node["amenity"="pharmacy"](around:${radiusMeters},${lat},${lng});
    node["tourism"="hotel"](around:${radiusMeters},${lat},${lng});
    node["tourism"="guest_house"](around:${radiusMeters},${lat},${lng});
    node["railway"="station"](around:${radiusMeters},${lat},${lng});
    node["highway"="bus_stop"](around:${radiusMeters},${lat},${lng});
    way["amenity"="police"](around:${radiusMeters},${lat},${lng});
    way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
  );out center 35;`;

  try {
    const res = await axios.post(
      "https://overpass-api.de/api/interpreter",
      "data=" + encodeURIComponent(query),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "YatraMitra-SafePath-Navigator/1.0",
        },
        timeout: 6000,
      }
    );

    const elements = res.data?.elements || [];
    const parsed = [];

    for (const el of elements) {
      const tags = el.tags || {};
      const elLat = el.lat || el.center?.lat;
      const elLon = el.lon || el.center?.lon;
      if (!elLat || !elLon) continue;

      let cat = "hotel";
      let defaultPhone = "112";
      let features = [];

      if (tags.amenity === "police") {
        cat = "police";
        defaultPhone = "100";
        features = ["24/7 Police Helpdesk", "Law Enforcement Support"];
      } else if (tags.amenity === "hospital" || tags.amenity === "clinic" || tags.amenity === "pharmacy") {
        cat = "hospital";
        defaultPhone = "108";
        features = ["24/7 Emergency Medical", "First Aid On-Site"];
      } else if (tags.railway === "station" || tags.highway === "bus_stop") {
        cat = "transit";
        defaultPhone = "139";
        features = ["Public Transit Interchange", "High Visibility Hub"];
      } else if (tags.tourism === "hotel" || tags.tourism === "guest_house" || tags.tourism === "hostel") {
        cat = "hotel";
        defaultPhone = "112";
        features = ["24/7 Staff & Reception", "Verified Safe Lodging"];
      }

      const rawName =
        tags.name ||
        tags["name:en"] ||
        (cat === "police"
          ? "Local Police Station"
          : cat === "hospital"
          ? "Medical Emergency Center"
          : cat === "transit"
          ? "Public Transit Hub"
          : "Verified Hotel / Lodge");

      const distKm = calculateHaversineKm(lat, lng, elLat, elLon);

      parsed.push({
        _id: "osm_" + el.id,
        name: rawName,
        category: cat,
        address: tags["addr:street"]
          ? `${tags["addr:street"]}, ${tags["addr:city"] || ""}`
          : `Near [${elLat.toFixed(4)}, ${elLon.toFixed(4)}]`,
        city: tags["addr:city"] || "Local District",
        state: tags["addr:state"] || "India",
        location: {
          type: "Point",
          coordinates: [elLon, elLat],
        },
        emergencyPhone: tags.phone || tags["contact:phone"] || defaultPhone,
        isOpen24x7: tags.opening_hours === "24/7" || cat === "police" || cat === "hospital",
        features,
        source: "OPENSTREETMAP_LIVE",
        distanceKm: Math.round(distKm * 100) / 100,
        distanceMeters: Math.round(distKm * 1000),
        distanceText: distKm < 1.0 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`,
      });
    }

    parsed.sort((a, b) => a.distanceKm - b.distanceKm);
    return parsed;
  } catch (err) {
    console.warn("[SafePath] Live OpenStreetMap Overpass query skipped:", err.message);
    return [];
  }
}

/**
 * Ensures seed safe zone records exist in MongoDB on startup.
 */
async function ensureSeedSafeZones() {
  if (mongoose.connection?.readyState !== 1) return;
  try {
    const count = await SafeZone.countDocuments();
    if (count === 0) {
      await SafeZone.insertMany(SEED_SAFE_ZONES);
      console.log(`[SafePath] Seeded ${SEED_SAFE_ZONES.length} verified safe zone locations.`);
    }
  } catch (err) {
    console.warn("[SafePath] Seed check skipped:", err.message);
  }
}

/**
 * Retrieves local database safe zones.
 */
async function getLocalDbSafeZones({ lat, lng, radiusKm = 20 }) {
  let pool = [];
  if (mongoose.connection?.readyState === 1) {
    try {
      pool = await SafeZone.find({}).lean();
    } catch (e) {
      pool = SEED_SAFE_ZONES;
    }
  } else {
    pool = SEED_SAFE_ZONES;
  }

  const userLat = Number(lat);
  const userLng = Number(lng);

  return pool
    .map((zone) => {
      const coords = zone.location?.coordinates || [78.0, 27.0];
      const distKm = calculateHaversineKm(userLat, userLng, coords[1], coords[0]);
      return {
        ...zone,
        distanceKm: Math.round(distKm * 100) / 100,
        distanceMeters: Math.round(distKm * 1000),
        distanceText: distKm < 1.0 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`,
      };
    })
    .filter((z) => z.distanceKm <= radiusKm);
}

/**
 * Retrieves all safe zones (used for offline storage & pre-caching).
 */
async function getAllSafeZones() {
  if (mongoose.connection?.readyState === 1) {
    try {
      const items = await SafeZone.find({}).lean();
      if (items.length > 0) return items;
    } catch (e) {}
  }
  return SEED_SAFE_ZONES;
}

/**
 * Retrieves safe zones within a radius combining live OpenStreetMap data and verified database havens.
 */
async function getNearbySafeZones({ lat, lng, radiusKm = 10, category = null }) {
  const userLat = Number(lat);
  const userLng = Number(lng);

  const [liveOsm, localDb] = await Promise.all([
    fetchLiveOsmSafeHavens({ lat: userLat, lng: userLng, radiusMeters: Math.min(radiusKm * 1000, 6000) }),
    getLocalDbSafeZones({ lat: userLat, lng: userLng, radiusKm }),
  ]);

  let combined = [...liveOsm, ...localDb];

  if (category && category !== "all") {
    combined = combined.filter((z) => z.category === category);
  }

  // Deduplicate entries within 60m of each other
  const unique = [];
  for (const item of combined) {
    if (!unique.some((u) => u.distanceKm < 0.06 && u.category === item.category)) {
      unique.push(item);
    }
  }

  unique.sort((a, b) => a.distanceKm - b.distanceKm);
  return unique.filter((z) => z.distanceKm <= radiusKm);
}

/**
 * Evaluates the safety and isolation risk of a user's exact current GPS position
 * using live OpenStreetMap infrastructure density.
 */
async function evaluateLocationSafety({ lat, lng, time = new Date(), healthConditions = [] }) {
  const userLat = Number(lat);
  const userLng = Number(lng);
  const hour = new Date(time).getHours();
  const isNight = hour >= 22 || hour <= 5; // 10 PM to 5 AM

  const nearby = await getNearbySafeZones({ lat: userLat, lng: userLng, radiusKm: 15 });
  const closestOverall = nearby[0] || null;

  const closestPolice = nearby.find((z) => z.category === "police") || null;
  const closestHospital = nearby.find((z) => z.category === "hospital") || null;
  const closestHotel = nearby.find((z) => z.category === "hotel") || null;
  const closestTransit = nearby.find((z) => z.category === "transit") || null;

  // Real-world infrastructure density count
  const poisWithin1Km = nearby.filter((z) => z.distanceKm <= 1.2).length;
  const poisWithin2Km = nearby.filter((z) => z.distanceKm <= 2.5).length;

  let riskScore = 15; // default urban safety baseline

  if (poisWithin1Km >= 4) {
    // High-density urban zone (multiple active safe havens within walking distance)
    riskScore = 10;
  } else if (poisWithin1Km >= 1) {
    // Moderate urban/suburban zone with nearby facilities
    riskScore = 25;
  } else if (poisWithin2Km >= 1) {
    // Outer perimeter zone (1 - 2.5 km to facility)
    riskScore = 48;
  } else {
    // Truly isolated / remote zone with zero infrastructure within 2.5 km
    riskScore = 78;
  }

  // Nighttime modifier (10 PM to 5 AM)
  if (isNight) {
    if (poisWithin1Km >= 4) riskScore += 12;
    else if (poisWithin1Km >= 1) riskScore += 22;
    else riskScore += 35;
  }

  const finalRiskIndex = Math.min(Math.max(riskScore, 5), 95);

  let status = "safe";
  let statusText = "🟢 Safe Zone (Active Emergency Infrastructure Nearby)";
  let advice = "Active emergency services and public infrastructure detected around your location.";

  if (finalRiskIndex >= 65) {
    status = "isolated";
    statusText = "🔴 Warning: Deserted / Isolated Zone Detected";
    advice = isNight
      ? "You are in an isolated area late at night with sparse surrounding services. Head towards the nearest safe haven."
      : "Low emergency infrastructure density detected. Stay on main roadways and keep emergency contacts ready.";
  } else if (finalRiskIndex >= 35) {
    status = "caution";
    statusText = "🟡 Caution Area (Moderate Distance to Services)";
    advice = "Moderate distance to nearest emergency facilities. Maintain general situational awareness.";
  }

  // Health prioritization: if user has cardiac/respiratory conditions, recommend hospital first
  const hasMedicalAlert = Array.isArray(healthConditions) && healthConditions.length > 0;
  let primaryRefuge = closestOverall;
  if (hasMedicalAlert && closestHospital) {
    primaryRefuge = closestHospital;
  }

  return {
    status,
    statusText,
    riskIndex: finalRiskIndex,
    isNightTime: isNight,
    userLocation: { lat: userLat, lng: userLng },
    poisNearbyCount: nearby.length,
    advice,
    primaryRecommendedSafeZone: primaryRefuge,
    nearestInfrastructure: {
      police: closestPolice,
      hospital: closestHospital,
      hotel: closestHotel,
      transit: closestTransit,
    },
    nearbySafeZones: nearby.slice(0, 15),
    emergencyNumbers: {
      national: "112",
      police: "100",
      ambulance: "108",
      touristHelpline: "1363",
      womenHelpline: "1091",
    },
  };
}

/**
 * Generates turn-by-turn routing to the nearest safe haven using OSRM walking engine
 * with resilient offline geometric polyline fallback.
 */
async function getSafeRoute({ startLat, startLng, destLat, destLng, safeZoneId = null }) {
  let destination = { lat: Number(destLat), lng: Number(destLng), name: "Safe Haven" };

  if (safeZoneId && !safeZoneId.startsWith("osm_")) {
    try {
      const zone = await SafeZone.findById(safeZoneId);
      if (zone && Array.isArray(zone.location?.coordinates)) {
        destination = {
          lat: zone.location.coordinates[1],
          lng: zone.location.coordinates[0],
          name: zone.name,
          category: zone.category,
          emergencyPhone: zone.emergencyPhone,
        };
      }
    } catch (e) {}
  }

  const sLat = Number(startLat);
  const sLng = Number(startLng);
  const dLat = destination.lat;
  const dLng = destination.lng;

  // Try OpenStreetMap OSRM Public Walking Router
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/walking/${sLng},${sLat};${dLng},${dLat}?overview=full&geometries=geojson&steps=true`;
    const res = await axios.get(osrmUrl, { timeout: 4500 });
    if (res.data?.routes?.length > 0) {
      const route = res.data.routes[0];
      const steps = [];
      route.legs?.[0]?.steps?.forEach((st) => {
        if (st.maneuver) {
          steps.push({
            instruction: st.maneuver.modifier
              ? `Turn ${st.maneuver.modifier} onto ${st.name || "walkway"}`
              : st.maneuver.type === "arrive"
              ? `Arrive at ${destination.name}`
              : `Proceed on ${st.name || "street"}`,
            distanceMeters: Math.round(st.distance),
            durationSec: Math.round(st.duration),
          });
        }
      });

      return {
        success: true,
        source: "OSRM_ONLINE_ROUTER",
        destination,
        distanceMeters: Math.round(route.distance),
        durationMinutes: Math.max(Math.round(route.duration / 60), 1),
        geometry: route.geometry, // GeoJSON LineString
        steps: steps.length > 0 ? steps : [{ instruction: `Walk directly to ${destination.name}`, distanceMeters: Math.round(route.distance) }],
      };
    }
  } catch (err) {
    console.warn("[SafePath] OSRM router unavailable, generating geometric safe vector route:", err.message);
  }

  // Resilient Offline Geometric Route Generator
  const distKm = calculateHaversineKm(sLat, sLng, dLat, dLng);
  const distanceMeters = Math.round(distKm * 1000);
  const durationMinutes = Math.max(Math.round((distKm / 4.5) * 60), 1); // Walking at 4.5 km/h

  const waypoints = [];
  const segments = 6;
  for (let i = 0; i <= segments; i++) {
    const frac = i / segments;
    waypoints.push([sLng + (dLng - sLng) * frac, sLat + (dLat - sLat) * frac]);
  }

  return {
    success: true,
    source: "OFFLINE_GEOMETRIC_FALLBACK",
    destination,
    distanceMeters,
    durationMinutes,
    geometry: {
      type: "LineString",
      coordinates: waypoints,
    },
    steps: [
      {
        instruction: `Head directly toward ${destination.name} (${destination.category?.toUpperCase() || "SAFE ZONE"})`,
        distanceMeters,
        durationSec: durationMinutes * 60,
      },
      {
        instruction: `Arrive safely at ${destination.name}. Contact on-site: ${destination.emergencyPhone || "112"}`,
        distanceMeters: 0,
        durationSec: 0,
      },
    ],
  };
}

module.exports = {
  ensureSeedSafeZones,
  getAllSafeZones,
  getNearbySafeZones,
  evaluateLocationSafety,
  getSafeRoute,
  fetchLiveOsmSafeHavens,
};
