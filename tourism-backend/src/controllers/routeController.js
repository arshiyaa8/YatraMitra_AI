const Monument = require("../models/Monument");
const { ApiError, asyncHandler } = require("../utils/apiError");

/**
 * Calculates great-circle distance in km between two GPS coordinates using Haversine formula
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371.0; // Earth radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDuration(totalMins) {
  if (totalMins < 60) return `${totalMins} mins`;
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return mins === 0 ? `${hrs} hr${hrs > 1 ? "s" : ""}` : `${hrs} hr${hrs > 1 ? "s" : ""} ${mins} min${mins > 1 ? "s" : ""}`;
}

/**
 * POST /api/routes/optimize
 * Arranges destinations into the most efficient sequence using Nearest-Neighbor TSP
 */
exports.optimizeRoute = asyncHandler(async (req, res) => {
  const { startLocation, waypoints } = req.body;

  if (!Array.isArray(waypoints) || waypoints.length === 0) {
    throw new ApiError(400, "Please provide an array of monument slugs or names in 'waypoints'");
  }

  // Resolve waypoints from MongoDB
  const monuments = await Monument.find({
    $or: [{ slug: { $in: waypoints } }, { name: { $in: waypoints } }],
  }).select("name slug location state category shortDescription");

  if (monuments.length === 0) {
    throw new ApiError(404, "None of the specified monuments were found in the database");
  }

  // Map to waypoint objects with lat/lng
  const destinations = monuments.map((m) => ({
    name: m.name,
    slug: m.slug,
    state: m.state,
    category: m.category,
    lat: m.location.coordinates[1],
    lng: m.location.coordinates[0],
    shortDescription: m.shortDescription,
  }));

  // Determine starting point
  let current = null;
  let unvisited = [];

  if (startLocation && typeof startLocation.lat === "number" && typeof startLocation.lng === "number") {
    current = {
      name: startLocation.name || "Starting Point",
      slug: "start",
      lat: startLocation.lat,
      lng: startLocation.lng,
      isStartPoint: true,
    };
    unvisited = [...destinations];
  } else {
    // If no start location, start from the first monument in the requested list
    current = destinations[0];
    unvisited = destinations.slice(1);
  }

  const optimizedPath = [current];
  const legs = [];
  let totalDistanceKm = 0;

  // Nearest-Neighbor algorithm
  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let shortestDist = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const dist = haversineDistance(current.lat, current.lng, unvisited[i].lat, unvisited[i].lng);
      if (dist < shortestDist) {
        shortestDist = dist;
        nearestIdx = i;
      }
    }

    const nextStop = unvisited[nearestIdx];
    unvisited.splice(nearestIdx, 1);

    // Approximate travel duration: assuming average speed of 35 km/h across urban/regional transit
    const legMins = Math.max(5, Math.round((shortestDist / 35) * 60));

    legs.push({
      from: current.name,
      to: nextStop.name,
      distanceKm: Math.round(shortestDist * 10) / 10,
      estimatedMins: legMins,
      formattedDuration: formatDuration(legMins),
    });

    totalDistanceKm += shortestDist;
    optimizedPath.push(nextStop);
    current = nextStop;
  }

  const totalTravelMins = legs.reduce((acc, leg) => acc + leg.estimatedMins, 0);

  res.json({
    success: true,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    estimatedTravelTimeMins: totalTravelMins,
    formattedDuration: formatDuration(totalTravelMins),
    stopsCount: optimizedPath.length,
    route: optimizedPath.map((loc, idx) => ({
      step: idx + 1,
      name: loc.name,
      slug: loc.slug,
      state: loc.state || "",
      category: loc.category || "",
      lat: loc.lat,
      lng: loc.lng,
      isStartPoint: Boolean(loc.isStartPoint),
    })),
    legs,
  });
});
