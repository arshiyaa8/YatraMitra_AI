/**
 * explore.js — search box + filters + monument grid + interactive Leaflet GPS map.
 * Backs onto GET /api/monuments (search/state/category/underexplored/page/limit)
 * and GET /api/monuments/nearby (lat/lng from the browser's geolocation).
 */

const state = {
  page: 1,
  limit: 12,
  search: "",
  stateFilter: "",
  categoryFilter: "",
  underexplored: false,
  knownStates: new Set(),
  nearbyMode: false,
  viewMode: "cards", // "cards" | "map"
};

let accessibilityFlagged = false;
let exploreMap = null;
let markerGroup = null;
let userLocation = null; // { lat, lng, accuracy }
let userMarker = null;
let userAccuracyCircle = null;
let currentLoadedMonuments = [];
let activeRoutePolyline = null;

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

document.addEventListener("DOMContentLoaded", () => {
  if (!YM.nationality.require()) return;

  YM.renderHeader("explore");
  YM.renderAlertBanner("alert-banner-host");
  YM.renderFestivalBanner("festival-banner-host");
  checkPersonalization();
  initExploreMap();
  setupViewSwitcher();
  applyLanguageToUI();

  // Listen for global language changes and immediately update UI
  window.addEventListener("ym-lang-changed", (e) => {
    applyLanguageToUI();
    const grid = document.getElementById("destination-grid");
    if (grid && currentLoadedMonuments.length > 0) {
      renderGrid(grid, currentLoadedMonuments);
      renderMapMarkers(currentLoadedMonuments);
    }
  });

  document.getElementById("search-form").addEventListener("submit", (e) => {
    e.preventDefault();
    state.nearbyMode = false;
    state.search = document.getElementById("search-input").value.trim();
    state.page = 1;
    loadMonuments();
  });

  document.getElementById("search-input").addEventListener(
    "input",
    YM.util.debounce((e) => {
      state.nearbyMode = false;
      state.search = e.target.value.trim();
      state.page = 1;
      loadMonuments();
    }, 400)
  );

  document.getElementById("state-filter").addEventListener("change", (e) => {
    state.nearbyMode = false;
    state.stateFilter = e.target.value;
    state.page = 1;
    loadMonuments();
  });

  document.getElementById("category-filter").addEventListener("change", (e) => {
    state.nearbyMode = false;
    state.categoryFilter = e.target.value;
    state.page = 1;
    loadMonuments();
  });

  document.getElementById("underexplored-toggle")?.addEventListener("change", (e) => {
    state.nearbyMode = false;
    state.underexplored = e.target.checked;
    state.page = 1;
    loadMonuments();
  });

  document.getElementById("near-me-btn").addEventListener("click", loadNearby);

  loadMonuments();
});

function applyLanguageToUI() {
  const heroTitle = document.querySelector(".page-hero h1");
  const heroSubtitle = document.querySelector(".page-hero p");
  const searchInput = document.getElementById("search-input");
  const searchBtn = document.querySelector("#search-form button[type='submit']");
  const cardsBtn = document.getElementById("view-cards-btn");
  const mapBtn = document.getElementById("view-map-btn");
  const nearMeBtn = document.getElementById("near-me-btn");
  const underexploredLabel = document.querySelector("label[for='underexplored-toggle']");
  const stateFilter = document.getElementById("state-filter");
  const catFilter = document.getElementById("category-filter");
  const closestBtn = document.getElementById("map-closest-btn");
  const locateBtn = document.getElementById("map-locate-btn");

  if (heroTitle) heroTitle.textContent = YM.t("explore_title", "Explore heritage sites");
  if (heroSubtitle) heroSubtitle.textContent = YM.t("explore_subtitle", "Search by name, state, or region. Every result comes from the live monument database.");
  if (searchInput) searchInput.placeholder = YM.t("search_placeholder", "e.g. Taj Mahal, Rajasthan, forts…");
  if (searchBtn) searchBtn.textContent = YM.t("search_btn", "Search");
  if (cardsBtn) cardsBtn.textContent = YM.t("cards_tab", "🗂️ Cards");
  if (mapBtn) mapBtn.textContent = YM.t("map_tab", "🗺️ Interactive Map");
  if (nearMeBtn) nearMeBtn.textContent = YM.t("near_me_btn", "📍 Near me");

  if (underexploredLabel) {
    const isChecked = document.getElementById("underexplored-toggle")?.checked;
    underexploredLabel.innerHTML = `
      <input type="checkbox" id="underexplored-toggle" style="width:auto; min-height:auto;" ${isChecked ? "checked" : ""} />
      ${YM.t("underexplored_label", "Underexplored gems only")}
    `;
    document.getElementById("underexplored-toggle")?.addEventListener("change", (e) => {
      state.nearbyMode = false;
      state.underexplored = e.target.checked;
      state.page = 1;
      loadMonuments();
    });
  }

  if (catFilter) {
    const val = catFilter.value;
    catFilter.options[0].textContent = YM.t("all_categories", "All categories");
    const optMap = {
      monument: "cat_monument",
      temple: "cat_temple",
      fort: "cat_fort",
      museum: "cat_museum",
      natural: "cat_natural",
      wildlife: "cat_wildlife",
      other: "cat_other",
    };
    for (let i = 1; i < catFilter.options.length; i++) {
      const opt = catFilter.options[i];
      if (optMap[opt.value]) {
        opt.textContent = YM.t(optMap[opt.value], opt.value);
      }
    }
    catFilter.value = val;
  }

  if (stateFilter && stateFilter.options.length > 0) {
    stateFilter.options[0].textContent = YM.t("all_states", "All states");
  }

  if (closestBtn) closestBtn.innerHTML = YM.t("route_closest", "🧭 Route to Closest Site");
  if (locateBtn) locateBtn.innerHTML = YM.t("my_location", "📍 My Location");
}

// ── Leaflet OpenStreetMap Initialization ─────────────────────────
function initExploreMap() {
  const mapEl = document.getElementById("explore-map");
  if (!mapEl || typeof L === "undefined") return;

  // Center on geographic center of India
  exploreMap = L.map("explore-map", {
    scrollWheelZoom: true,
  }).setView([22.5, 80], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18,
  }).addTo(exploreMap);

  markerGroup = L.featureGroup().addTo(exploreMap);

  const container = document.getElementById("map-view-container");
  if (container) {
    // Floating "🧭 Route to Closest Monument" button
    if (!document.getElementById("map-closest-btn")) {
      const closestBtn = document.createElement("button");
      closestBtn.id = "map-closest-btn";
      closestBtn.className = "map-closest-btn";
      closestBtn.type = "button";
      closestBtn.innerHTML = `🧭 Route to Closest Site`;
      closestBtn.title = "Find and draw route to nearest heritage destination";
      closestBtn.addEventListener("click", routeToClosestMonument);
      container.appendChild(closestBtn);
    }

    // Floating "📍 Locate Me" button
    if (!document.getElementById("map-locate-btn")) {
      const locateBtn = document.createElement("button");
      locateBtn.id = "map-locate-btn";
      locateBtn.className = "map-locate-btn";
      locateBtn.type = "button";
      locateBtn.innerHTML = `📍 My Location`;
      locateBtn.title = "Center map on my current GPS location";
      locateBtn.addEventListener("click", () => {
        locateUserOnMap(true);
      });
      container.appendChild(locateBtn);
    }
  }

  // Attempt initial background location detection
  locateUserOnMap(false);
}

function locateUserOnMap(flyTo = true, callback = null) {
  if (!navigator.geolocation) {
    if (callback) callback(null);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };

      if (exploreMap) {
        if (userMarker) exploreMap.removeLayer(userMarker);
        if (userAccuracyCircle) exploreMap.removeLayer(userAccuracyCircle);

        // Custom pulsing blue GPS dot
        const userIcon = L.divIcon({
          className: "user-location-marker",
          html: `<div class="user-location-pulse"></div><div class="user-location-dot"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        userMarker = L.marker([userLocation.lat, userLocation.lng], {
          icon: userIcon,
          zIndexOffset: 1000,
        }).addTo(exploreMap);

        userMarker.bindPopup(`
          <div style="padding:0.4rem 0.2rem; min-width:140px; text-align:center;">
            <strong style="color:#007aff; font-size:0.95rem;">📍 You are here</strong>
            <p style="margin:0.25rem 0 0; font-size:0.8rem; color:var(--ink-soft);">GPS Accuracy ~${Math.round(userLocation.accuracy)}m</p>
          </div>
        `);

        userAccuracyCircle = L.circle([userLocation.lat, userLocation.lng], {
          radius: Math.max(userLocation.accuracy, 60),
          color: "#007aff",
          fillColor: "#007aff",
          fillOpacity: 0.1,
          weight: 1,
        }).addTo(exploreMap);

        if (flyTo) {
          exploreMap.flyTo([userLocation.lat, userLocation.lng], 12, { duration: 1.5 });
          userMarker.openPopup();
        }
      }

      // Re-render markers and grid cards to display updated distance badges
      if (currentLoadedMonuments.length > 0) {
        renderMapMarkers(currentLoadedMonuments);
        const grid = document.getElementById("destination-grid");
        if (grid) renderGrid(grid, currentLoadedMonuments);
      }

      if (callback) callback(userLocation);
    },
    (err) => {
      console.warn("Geolocation warning:", err.message);
      if (callback) callback(null);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}

function routeToClosestMonument() {
  if (!userLocation) {
    locateUserOnMap(true, (loc) => {
      if (!loc) {
        alert("Please enable location permissions in your browser to find the closest monument.");
        return;
      }
      routeToClosestMonument();
    });
    return;
  }

  const validItems = currentLoadedMonuments.filter(
    (m) => m.location?.coordinates && m.location.coordinates.length >= 2
  );

  if (validItems.length === 0) {
    alert("No monuments available on map to calculate route.");
    return;
  }

  let closest = null;
  let minDist = Infinity;

  validItems.forEach((m) => {
    const [lng, lat] = m.location.coordinates;
    const dist = calculateDistanceKm(userLocation.lat, userLocation.lng, lat, lng);
    if (dist < minDist) {
      minDist = dist;
      closest = m;
    }
  });

  if (closest) {
    drawRouteToMonument(closest, true);
  }
}

function drawRouteToMonument(m, isClosest = false) {
  if (!userLocation) {
    locateUserOnMap(true, (loc) => {
      if (loc) drawRouteToMonument(m, isClosest);
    });
    return;
  }

  if (!m.location?.coordinates || m.location.coordinates.length < 2) return;
  const [destLng, destLat] = m.location.coordinates;
  const dist = calculateDistanceKm(userLocation.lat, userLocation.lng, destLat, destLng);
  const driveMins = Math.max(1, Math.round((dist / 35) * 60));
  const driveTimeText = driveMins >= 60 ? `${Math.floor(driveMins / 60)} hr ${driveMins % 60} mins` : `${driveMins} mins`;
  const walkMins = Math.max(1, Math.round((dist / 4.5) * 60));

  // Remove existing polyline
  if (activeRoutePolyline && exploreMap) {
    exploreMap.removeLayer(activeRoutePolyline);
  }

  // Draw connecting dashed route line
  activeRoutePolyline = L.polyline(
    [
      [userLocation.lat, userLocation.lng],
      [destLat, destLng],
    ],
    {
      color: "#800000", // Heritage Maroon
      weight: 5,
      opacity: 0.9,
      dashArray: "8, 8",
    }
  ).addTo(exploreMap);

  exploreMap.fitBounds(activeRoutePolyline.getBounds(), { padding: [60, 60], maxZoom: 15 });

  // Floating route information card HUD
  const container = document.getElementById("map-view-container");
  let panel = document.getElementById("map-route-panel");
  if (!panel && container) {
    panel = document.createElement("div");
    panel.id = "map-route-panel";
    panel.className = "map-route-panel";
    container.appendChild(panel);
  }

  if (panel) {
    panel.hidden = false;
    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.35rem;">
        <div>
          <span style="font-size:0.75rem; color:var(--maroon); font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">${isClosest ? "⭐ Nearest Heritage Site" : "🧭 Selected Destination Route"}</span>
          <h4 style="margin:0.15rem 0; font-size:1.05rem; color:var(--maroon-dark);">${YM.util.escapeHtml(m.name)}</h4>
          <p style="margin:0; font-size:0.8rem; color:var(--ink-soft);">${YM.util.escapeHtml(m.state)}</p>
        </div>
        <button type="button" id="close-route-btn" style="background:none; border:none; font-size:1.25rem; cursor:pointer; color:var(--ink-soft); line-height:1; padding:0.1rem 0.3rem;" title="Clear Route">&times;</button>
      </div>
      <div style="display:flex; gap:0.5rem; margin:0.4rem 0 0.75rem; font-size:0.85rem; font-weight:600; flex-wrap:wrap; align-items:center;">
        <span style="color:#007aff;">🚗 ${dist} km</span>
        <span style="color:var(--ink-soft);">·</span>
        <span style="color:var(--teal-dark);">⏱️ ~${driveTimeText} drive</span>
        ${dist < 5 ? `<span style="color:var(--ink-soft);">·</span><span style="color:var(--ink-soft);">🚶 ~${walkMins} mins walk</span>` : ""}
      </div>
      <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
        <a href="https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${destLat},${destLng}&travelmode=driving" target="_blank" rel="noopener" class="btn btn--sm btn--primary" style="font-size:0.8rem; flex:1; text-align:center; text-decoration:none; padding:0.4rem 0.6rem;">🧭 Open GPS Navigation &rarr;</a>
        <a href="monument.html?slug=${encodeURIComponent(m.slug)}" class="btn btn--sm btn--ghost" style="font-size:0.8rem; padding:0.4rem 0.6rem;" onclick="sessionStorage.setItem('ym_selected_monument', '${YM.util.escapeHtml(m.slug)}')">View Guide</a>
      </div>
    `;

    document.getElementById("close-route-btn")?.addEventListener("click", clearActiveRoute);
  }
}

function clearActiveRoute() {
  if (activeRoutePolyline && exploreMap) {
    exploreMap.removeLayer(activeRoutePolyline);
    activeRoutePolyline = null;
  }
  const panel = document.getElementById("map-route-panel");
  if (panel) panel.hidden = true;
}

// Expose global route trigger for popup buttons
window.YM_routeTo = function (slug) {
  const m = currentLoadedMonuments.find((item) => item.slug === slug);
  if (m) {
    drawRouteToMonument(m, false);
  }
};

function setupViewSwitcher() {
  const cardsBtn = document.getElementById("view-cards-btn");
  const mapBtn = document.getElementById("view-map-btn");
  const mapContainer = document.getElementById("map-view-container");
  const gridContainer = document.getElementById("destination-grid");
  const paginationContainer = document.getElementById("pagination");

  if (!cardsBtn || !mapBtn) return;

  cardsBtn.addEventListener("click", () => {
    state.viewMode = "cards";
    cardsBtn.classList.add("chip-toggle--active");
    mapBtn.classList.remove("chip-toggle--active");
    mapContainer.hidden = true;
    gridContainer.hidden = false;
    paginationContainer.hidden = false;
  });

  mapBtn.addEventListener("click", () => {
    state.viewMode = "map";
    mapBtn.classList.add("chip-toggle--active");
    cardsBtn.classList.remove("chip-toggle--active");
    gridContainer.hidden = true;
    paginationContainer.hidden = true;
    mapContainer.hidden = false;

    if (exploreMap) {
      setTimeout(() => {
        exploreMap.invalidateSize();
        if (markerGroup && markerGroup.getLayers().length > 0) {
          exploreMap.fitBounds(markerGroup.getBounds(), { padding: [40, 40], maxZoom: 13 });
        }
      }, 100);
    }
  });
}

function renderMapMarkers(items) {
  if (!exploreMap || !markerGroup) return;

  markerGroup.clearLayers();
  const validItems = items.filter(
    (m) => m.location?.coordinates && m.location.coordinates.length >= 2
  );

  validItems.forEach((m) => {
    // GeoJSON coordinates in MongoDB are [lng, lat], Leaflet requires [lat, lng]
    const [lng, lat] = m.location.coordinates;
    const nationality = YM.nationality.get();
    const fee = m.entryFee && (nationality === "indian" ? m.entryFee.indian : m.entryFee.foreigner);
    const feeLabel = fee === 0 ? YM.t("free_entry", "Free entry") : fee ? `${m.entryFee.currency || "INR"} ${fee} ${YM.t("entry_fee", "entry")}` : "";

    const loc = YM.i18n.getMonument(m.slug, m.name, m.shortDescription);
    const mName = loc.name;

    let distText = "";
    if (userLocation) {
      const dist = calculateDistanceKm(userLocation.lat, userLocation.lng, lat, lng);
      distText = `<div style="font-size:0.8rem; color:#0066cc; font-weight:600; margin-bottom:0.35rem;">🚗 ${dist} km ${YM.t("from_you", "from your location")}</div>`;
    }

    const marker = L.marker([lat, lng]);
    marker.bindPopup(`
      <div class="map-popup-card">
        <div class="map-popup-arch">${YM.util.escapeHtml(YM.t("cat_" + (m.category || "monument"), m.category || "monument"))}</div>
        <div style="padding: 0.6rem 0.2rem 0;">
          <h4>${YM.util.escapeHtml(mName)}</h4>
          <p>${YM.util.escapeHtml(m.state)}${m.district ? ` · ${YM.util.escapeHtml(m.district)}` : ""}</p>
          ${distText}
          ${feeLabel ? `<div style="font-size:0.78rem; color:var(--maroon); font-weight:600; margin-bottom:0.4rem;">${YM.util.escapeHtml(feeLabel)}</div>` : ""}
          <div style="display:flex; flex-direction:column; gap:0.35rem; margin-top:0.4rem;">
            <button type="button" class="btn btn--sm btn--primary" style="font-size:0.78rem; padding:0.35rem 0.6rem; width:100%; text-align:center;" onclick="window.YM_routeTo('${m.slug}')">🧭 ${YM.t("route_closest", "Route from My Location")}</button>
            <a class="map-popup-link" href="monument.html?slug=${encodeURIComponent(m.slug)}" onclick="sessionStorage.setItem('ym_selected_monument', '${YM.util.escapeHtml(m.slug)}')">${YM.t("view_guide", "View Full Guide")} &rarr;</a>
          </div>
        </div>
      </div>
    `);
    markerGroup.addLayer(marker);
  });

  if (validItems.length > 0 && state.viewMode === "map" && !activeRoutePolyline) {
    exploreMap.fitBounds(markerGroup.getBounds(), { padding: [40, 40], maxZoom: 13 });
  }
}

// Recommendation flags from health/accessibility profile
async function checkPersonalization() {
  if (!YM.auth.isLoggedIn()) return;
  try {
    const res = await YM.api.getRecommendationFlags();
    accessibilityFlagged = (res.flags || []).includes("prefer_wheelchair_accessible_sites");
  } catch {
    accessibilityFlagged = false;
  }
}

async function loadMonuments() {
  const grid = document.getElementById("destination-grid");
  const status = document.getElementById("results-status");
  status.textContent = "…";
  document.getElementById("near-me-status").textContent = "";

  try {
    // If map view is active, request higher limit to show comprehensive pins
    const queryLimit = state.viewMode === "map" ? 50 : state.limit;

    const res = await YM.api.listMonuments({
      search: state.search || undefined,
      state: state.stateFilter || undefined,
      category: state.categoryFilter || undefined,
      underexplored: state.underexplored ? "true" : undefined,
      page: state.page,
      limit: queryLimit,
    });

    const items = res.data || [];
    currentLoadedMonuments = items;
    items.forEach((m) => state.knownStates.add(m.state));
    populateStateFilter();

    renderGrid(grid, items);
    renderMapMarkers(items);

    status.textContent = `${res.total} ${res.total === 1 ? YM.t("destination_found", "destination found") : YM.t("destinations_found", "destinations found")}`;
    renderPagination(res.total, res.page);
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<p class="empty-state">Couldn't reach the server. Is the backend running at ${window.YM_CONFIG.API_BASE_URL}?</p>`;
    status.textContent = "";
    document.getElementById("pagination").innerHTML = "";
  }
}

async function loadNearby() {
  if (!navigator.geolocation) {
    document.getElementById("near-me-status").textContent = "Location isn't available on this device/browser.";
    return;
  }
  const statusEl = document.getElementById("near-me-status");
  statusEl.textContent = "Finding your location…";

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      statusEl.textContent = "Looking for heritage sites nearby…";
      try {
        const res = await YM.api.getNearby({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          radiusKm: 50,
        });
        state.nearbyMode = true;
        const grid = document.getElementById("destination-grid");
        const items = res.data || [];
        currentLoadedMonuments = items;

        renderGrid(grid, items);
        renderMapMarkers(items);

        // Center map directly on user's current GPS position
        if (exploreMap) {
          locateUserOnMap(true);
        }

        document.getElementById("results-status").textContent = `${res.count} site${res.count === 1 ? "" : "s"} within 50km`;
        document.getElementById("pagination").innerHTML = "";
        statusEl.textContent = "";
      } catch (err) {
        statusEl.textContent = `Couldn't load nearby sites: ${err.message}`;
      }
    },
    () => {
      statusEl.textContent = "Location permission was denied — allow it to see nearby sites.";
    }
  );
}

function renderGrid(grid, items) {
  if (items.length === 0) {
    grid.innerHTML = `<p class="empty-state">No monuments matched that search. Try a different name, state, or category.</p>`;
  } else {
    grid.innerHTML = items.map(monumentCard).join("");
  }
}

function monumentCard(m) {
  const nationality = YM.nationality.get();
  const fee =
    m.entryFee && (nationality === "indian" ? m.entryFee.indian : m.entryFee.foreigner);
  const feeLabel =
    fee === 0 ? YM.t("free_entry", "Free entry") : fee ? `${m.entryFee.currency || "INR"} ${fee} ${YM.t("entry_fee", "entry")}` : "";

  const isAccessible = (m.accessibility?.tags || []).includes("wheelchair_accessible");
  const imgUrl = m.images && m.images.length > 0 ? m.images[0] : null;

  // Localized name & description
  const loc = YM.i18n.getMonument(m.slug, m.name, m.shortDescription);
  const localizedName = loc.name;
  const localizedDesc = loc.desc;

  let distanceBadge = "";
  if (userLocation && m.location?.coordinates && m.location.coordinates.length >= 2) {
    const [mLng, mLat] = m.location.coordinates;
    const dist = calculateDistanceKm(userLocation.lat, userLocation.lng, mLat, mLng);
    distanceBadge = `<span class="badge badge--distance">🚗 ${dist} km ${YM.t("from_you", "away")}</span>`;
  }

  return `
    <article class="card" style="overflow:hidden; display:flex; flex-direction:column;">
      <div class="card-arch" style="${imgUrl ? `background-image: linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.65) 100%), url('${imgUrl}'); background-size: cover; background-position: center; min-height: 140px; position:relative;` : ""}" aria-hidden="true">
        <span class="card-arch-label" style="${imgUrl ? "background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);" : ""}">${YM.util.escapeHtml(YM.t("cat_" + (m.category || "monument"), m.category || "monument"))}</span>
      </div>
      <div class="card-body" style="flex:1; display:flex; flex-direction:column;">
        <h3>${YM.util.escapeHtml(localizedName)}</h3>
        <p class="card-meta">${YM.util.escapeHtml(m.state)}${m.district ? `, ${YM.util.escapeHtml(m.district)}` : ""}</p>
        <p class="card-desc">${YM.util.escapeHtml(localizedDesc || "")}</p>
        <div class="card-footer" style="margin-top:auto; padding-top:0.6rem; display:flex; flex-wrap:wrap; gap:0.35rem;">
          ${distanceBadge}
          ${feeLabel ? `<span class="badge badge--fee">${YM.util.escapeHtml(feeLabel)}</span>` : ""}
          ${m.isUnderexplored ? `<span class="badge badge--underexplored">${YM.t("underexplored_gem", "Underexplored gem")}</span>` : ""}
          ${accessibilityFlagged && isAccessible ? `<span class="badge badge--accessible">${YM.t("accessible_badge", "Matches your accessibility needs")}</span>` : ""}
        </div>
        <a class="card-link" href="monument.html?slug=${encodeURIComponent(m.slug)}" onclick="sessionStorage.setItem('ym_selected_monument', '${YM.util.escapeHtml(m.slug)}')">${YM.t("view_details", "View details →")}</a>
      </div>
    </article>
  `;
}

function populateStateFilter() {
  const select = document.getElementById("state-filter");
  const existing = new Set(Array.from(select.options).map((o) => o.value));
  Array.from(state.knownStates)
    .sort()
    .forEach((s) => {
      if (!existing.has(s)) {
        const opt = document.createElement("option");
        opt.value = s;
        opt.textContent = s;
        select.appendChild(opt);
      }
    });
  select.value = state.stateFilter;
}

function renderPagination(total, page) {
  const host = document.getElementById("pagination");
  if (state.nearbyMode) {
    host.innerHTML = "";
    return;
  }
  const totalPages = Math.max(1, Math.ceil(total / state.limit));
  if (totalPages <= 1) {
    host.innerHTML = "";
    return;
  }
  host.innerHTML = `
    <button class="btn btn--ghost" id="prev-page" ${page <= 1 ? "disabled" : ""}>&larr; Previous</button>
    <span class="pagination-status">Page ${page} of ${totalPages}</span>
    <button class="btn btn--ghost" id="next-page" ${page >= totalPages ? "disabled" : ""}>Next &rarr;</button>
  `;
  const prev = document.getElementById("prev-page");
  const next = document.getElementById("next-page");
  if (prev) prev.addEventListener("click", () => { state.page -= 1; loadMonuments(); window.scrollTo(0, 0); });
  if (next) next.addEventListener("click", () => { state.page += 1; loadMonuments(); window.scrollTo(0, 0); });
}
