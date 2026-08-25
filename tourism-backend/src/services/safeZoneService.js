/**
 * safeZoneService.js — SafePath Navigation, Isolation Scoring & Safe Zone Routing Service
 *
 * Provides real-time isolation risk scoring, nearby emergency safe haven discovery (police,
 * 24/7 hospitals, verified hotels, transport hubs), and turn-by-turn safe haven routing.
 */

const mongoose = require("mongoose");
const axios = require("axios");
const SafeZone = require("../models/SafeZone");

// Canonical Seed Safe Zones across India's premier tourist circuits
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
  {
    name: "Rambagh Palace Security & Haven",
    category: "hotel",
    address: "Bhawani Singh Road, Jaipur, Rajasthan",
    city: "Jaipur",
    state: "Rajasthan",
    location: { type: "Point", coordinates: [75.8085, 26.8975] },
    emergencyPhone: "0141-2211919",
    isOpen24x7: true,
    features: ["24/7 Guarded Gates", "First Aid On-Site", "Emergency Transport"],
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
  {
    name: "The Taj Mahal Palace Hotel Security Zone",
    category: "hotel",
    address: "Apollo Bunder, Colaba, Mumbai, Maharashtra",
    city: "Mumbai",
    state: "Maharashtra",
    location: { type: "Point", coordinates: [72.8333, 18.9217] },
    emergencyPhone: "022-66653366",
    isOpen24x7: true,
    features: ["High-Security Guarding", "24/7 Medical Room", "Safe Haven"],
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
 * Retrieves safe zones within a radius from the specified latitude/longitude.
 */
async function getNearbySafeZones({ lat, lng, radiusKm = 10, category = null }) {
  const userLat = Number(lat);
  const userLng = Number(lng);

  let pool = [];
  if (mongoose.connection?.readyState === 1) {
    try {
      const query = {};
      if (category && category !== "all") query.category = category;
      pool = await SafeZone.find(query).lean();
    } catch (e) {
      pool = SEED_SAFE_ZONES;
    }
  } else {
    pool = SEED_SAFE_ZONES;
  }

  if (category && category !== "all") {
    pool = pool.filter((z) => z.category === category);
  }

  const withDist = pool.map((zone) => {
    const coords = zone.location?.coordinates || [78.0, 27.0];
    const distKm = calculateHaversineKm(userLat, userLng, coords[1], coords[0]);
    return {
      ...zone,
      distanceKm: Math.round(distKm * 100) / 100,
      distanceMeters: Math.round(distKm * 1000),
      distanceText: distKm < 1.0 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`,
    };
  });

  withDist.sort((a, b) => a.distanceKm - b.distanceKm);
  return withDist.filter((z) => z.distanceKm <= radiusKm);
}

/**
 * Evaluates the safety and isolation risk of a user's current GPS position.
 * Returns safety category ('safe', 'caution', 'isolated'), risk index (0-100),
 * proximity to nearest emergency infrastructure, and recommended refuge.
 */
async function evaluateLocationSafety({ lat, lng, time = new Date(), healthConditions = [] }) {
  const userLat = Number(lat);
  const userLng = Number(lng);
  const hour = new Date(time).getHours();
  const isNight = hour >= 22 || hour <= 5; // 10 PM to 5 AM

  const nearby = await getNearbySafeZones({ lat: userLat, lng: userLng, radiusKm: 25 });
  const closestOverall = nearby[0] || null;

  const closestPolice = nearby.find((z) => z.category === "police") || null;
  const closestHospital = nearby.find((z) => z.category === "hospital") || null;
  const closestHotel = nearby.find((z) => z.category === "hotel") || null;
  const closestTransit = nearby.find((z) => z.category === "transit") || null;

  // Base isolation score: proportional to distance to nearest safe POI
  const distToClosestKm = closestOverall ? closestOverall.distanceKm : 5.0;
  let riskScore = 10;

  if (distToClosestKm > 2.0) riskScore += 45; // > 2km from any POI is isolated
  else if (distToClosestKm > 1.0) riskScore += 25;
  else if (distToClosestKm > 0.4) riskScore += 10;
  else riskScore -= 10;

  if (isNight) riskScore += 28; // Night penalty

  if (!closestPolice || closestPolice.distanceKm > 3.0) riskScore += 12;
  if (!closestHospital || closestHospital.distanceKm > 4.0) riskScore += 10;

  const finalRiskIndex = Math.min(Math.max(riskScore, 5), 95);

  let status = "safe";
  let statusText = "🟢 Safe Zone (Active Emergency Infrastructure Nearby)";
  let advice = "You are in close proximity to verified safe havens. Enjoy your exploration!";

  if (finalRiskIndex >= 65) {
    status = "isolated";
    statusText = "🔴 Warning: Deserted / Isolated Zone Detected";
    advice = isNight
      ? "You are in an isolated area late at night with sparse surrounding services. Head towards the nearest safe haven."
      : "Low emergency infrastructure density detected. Stay on main roadways and keep emergency contacts ready.";
  } else if (finalRiskIndex >= 35) {
    status = "caution";
    statusText = "🟡 Caution Area (Moderate Distance to Services)";
    advice = "Moderate distance to nearest safe havens. Maintain general situational awareness.";
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
    advice,
    primaryRecommendedSafeZone: primaryRefuge,
    nearestInfrastructure: {
      police: closestPolice,
      hospital: closestHospital,
      hotel: closestHotel,
      transit: closestTransit,
    },
    nearbySafeZones: nearby.slice(0, 8),
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
 * Generates turn-by-turn routing to the nearest safe zone using OSRM walking engine
 * with resilient offline geometric polyline fallback.
 */
async function getSafeRoute({ startLat, startLng, destLat, destLng, safeZoneId = null }) {
  let destination = { lat: Number(destLat), lng: Number(destLng), name: "Safe Haven" };

  if (safeZoneId) {
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

  // Create intermediate interpolated waypoints for smooth Leaflet rendering
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
};
