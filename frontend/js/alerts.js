/**
 * alerts.js — SafePath Safe Zone Navigator & National Disaster Alerts Controller
 *
 * Integrates:
 * - Live GPS Isolation & Deserted Area Risk Scoring
 * - Interactive Leaflet Safe Haven Map & Turn-by-Turn Safe Navigation
 * - 1-Tap SOS Emergency Dispatcher with Live GPS Distress SMS Generation
 * - NDMA SACHET Disaster Warnings & Advisory Feed
 */

let _safeMap = null;
let _userMarker = null;
let _safeZoneMarkersGroup = null;
let _routeLayer = null;
let _currentCategory = "all";
let _currentUserCoords = { lat: 27.1735, lng: 78.0465 }; // Default to Agra Heritage Precinct

document.addEventListener("DOMContentLoaded", () => {
  YM.renderHeader("alerts");

  // Initialize SafePath Interactive Map
  initSafePathMap();

  // Bind SOS & Locator buttons
  setupSafePathActions();

  // Load NDMA SACHET Disaster alerts
  setupDisasterAlerts();

  // Automatically request GPS position or scan default preset
  locateUserAndScan(false);
});

// ── 1. SafePath Map Initialization ─────────────────────────────────────────
function initSafePathMap() {
  const mapEl = document.getElementById("safepath-map");
  if (!mapEl || typeof L === "undefined") return;

  _safeMap = L.map("safepath-map", {
    center: [_currentUserCoords.lat, _currentUserCoords.lng],
    zoom: 14,
    zoomControl: true,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
  }).addTo(_safeMap);

  _safeZoneMarkersGroup = L.layerGroup().addTo(_safeMap);
}

// ── 2. Location Tracking & Safety Isolation Scanning ───────────────────────
function setupSafePathActions() {
  const locateBtn = document.getElementById("btn-locate-safepath");
  if (locateBtn) {
    locateBtn.addEventListener("click", () => locateUserAndScan(true));
  }

  // 1-Tap Copy Distress SMS with Live GPS
  const copySmsBtn = document.getElementById("btn-copy-distress-sms");
  const copyStatus = document.getElementById("distress-copy-status");
  if (copySmsBtn) {
    copySmsBtn.addEventListener("click", () => {
      const lat = _currentUserCoords.lat.toFixed(5);
      const lng = _currentUserCoords.lng.toFixed(5);
      const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
      const msg = `EMERGENCY SOS: I need urgent assistance! My live location: ${mapsUrl} (GPS: ${lat}, ${lng}). Please dispatch help immediately.`;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(msg).then(() => {
          if (copyStatus) copyStatus.textContent = "✅ Distress SMS copied with live GPS coordinates! Paste into your messaging app.";
          setTimeout(() => { if (copyStatus) copyStatus.textContent = ""; }, 5000);
        });
      } else {
        prompt("Copy Emergency Distress SMS:", msg);
      }
    });
  }

  // Category Filter Chips
  document.querySelectorAll(".safe-filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".safe-filter-chip").forEach((c) => c.classList.remove("chip--active"));
      chip.classList.add("chip--active");
      _currentCategory = chip.dataset.cat || "all";
      renderNearbySafeZonesList();
      renderSafeZoneMarkers();
    });
  });

  // City Preset Chips
  document.querySelectorAll(".city-preset-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const lat = parseFloat(chip.dataset.lat);
      const lng = parseFloat(chip.dataset.lng);
      _currentUserCoords = { lat, lng };
      if (_safeMap) _safeMap.setView([lat, lng], 14);
      evaluateSafetyAndRender(lat, lng);
    });
  });

  // Close Route Directions Drawer
  const closeRouteBtn = document.getElementById("btn-close-route");
  const directionsBlock = document.getElementById("safepath-route-directions");
  if (closeRouteBtn && directionsBlock) {
    closeRouteBtn.addEventListener("click", () => {
      directionsBlock.hidden = true;
      if (_routeLayer && _safeMap) {
        _safeMap.removeLayer(_routeLayer);
        _routeLayer = null;
      }
    });
  }
}

function locateUserAndScan(userInitiated = false) {
  const statusTitle = document.getElementById("safepath-status-title");
  if (statusTitle) statusTitle.textContent = "Acquiring live GPS fix…";

  if (!navigator.geolocation) {
    evaluateSafetyAndRender(_currentUserCoords.lat, _currentUserCoords.lng);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      _currentUserCoords = { lat, lng };
      if (_safeMap) _safeMap.setView([lat, lng], 15);
      evaluateSafetyAndRender(lat, lng);
    },
    (err) => {
      if (userInitiated) {
        console.warn("GPS access denied, using preset center:", err.message);
      }
      evaluateSafetyAndRender(_currentUserCoords.lat, _currentUserCoords.lng);
    },
    { enableHighAccuracy: true, timeout: 6000 }
  );
}

let _cachedEvaluation = null;

async function evaluateSafetyAndRender(lat, lng) {
  const statusBox = document.getElementById("safepath-status-box");
  const statusTitle = document.getElementById("safepath-status-title");
  const statusDesc = document.getElementById("safepath-status-desc");
  const riskScoreEl = document.getElementById("safepath-risk-score");

  try {
    const res = await YM.api.evaluateLocationSafety({ lat, lng });
    _cachedEvaluation = res;

    const risk = res.riskIndex || 20;
    const status = res.status || "safe";

    if (riskScoreEl) riskScoreEl.textContent = `${risk}%`;
    if (statusTitle) statusTitle.textContent = res.statusText || "Safe Zone";
    if (statusDesc) statusDesc.textContent = res.advice || "Surrounding safety infrastructure active.";

    if (statusBox) {
      statusBox.className = `safepath-status-banner safepath-status--${status}`;
    }

    // Render User Beacon Marker on Leaflet
    renderUserBeacon(lat, lng, status);

    // Render Safe Zone Pins on Leaflet
    renderSafeZoneMarkers();

    // Render Safe Zones List
    renderNearbySafeZonesList();
  } catch (err) {
    console.error("Safety evaluation failed:", err);
    if (statusTitle) statusTitle.textContent = "Safe Haven Discovery Active";
    if (statusDesc) statusDesc.textContent = "Displaying verified 24/7 emergency infrastructure.";
    renderSafeZoneMarkers();
    renderNearbySafeZonesList();
  }
}

function renderUserBeacon(lat, lng, status) {
  if (!_safeMap) return;

  if (_userMarker) {
    _safeMap.removeLayer(_userMarker);
  }

  const color = status === "isolated" ? "#b71c1c" : status === "caution" ? "#f57f17" : "#2e7d32";

  _userMarker = L.circleMarker([lat, lng], {
    radius: 9,
    fillColor: color,
    color: "#ffffff",
    weight: 2.5,
    opacity: 1,
    fillOpacity: 0.9,
  }).addTo(_safeMap);

  _userMarker.bindPopup(`<strong>📍 Your Current Location</strong><br>Safety Status: ${status.toUpperCase()}`).openPopup();
}

function renderSafeZoneMarkers() {
  if (!_safeMap || !_safeZoneMarkersGroup) return;
  _safeZoneMarkersGroup.clearLayers();

  const zones = _cachedEvaluation?.nearbySafeZones || [];
  const filtered = _currentCategory === "all" ? zones : zones.filter((z) => z.category === _currentCategory);

  const iconEmojis = {
    police: "👮",
    hospital: "🏥",
    hotel: "🏨",
    transit: "🚉",
    tourist_booth: "ℹ️",
  };

  filtered.forEach((zone) => {
    const coords = zone.location?.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      const lat = coords[1];
      const lng = coords[0];
      const emoji = iconEmojis[zone.category] || "🛡️";

      const markerHtml = `
        <div style="background:#ffffff; border:2px solid var(--maroon-dark); border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; font-size:15px; box-shadow:0 2px 6px rgba(0,0,0,0.3);">
          ${emoji}
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: "custom-safezone-pin",
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const m = L.marker([lat, lng], { icon: customIcon }).addTo(_safeZoneMarkersGroup);

      const popupContent = `
        <div style="padding:0.2rem 0.3rem;">
          <strong style="color:var(--maroon-dark); display:block; margin-bottom:0.2rem;">${emoji} ${YM.util.escapeHtml(zone.name)}</strong>
          <span style="font-size:0.75rem; color:var(--ink-light); display:block;">${YM.util.escapeHtml(zone.address || "")}</span>
          <span style="font-size:0.75rem; font-weight:700; color:var(--teal); display:block; margin:0.3rem 0;">Distance: ${zone.distanceText || ""}</span>
          <div style="display:flex; gap:0.4rem; margin-top:0.4rem;">
            <a href="tel:${zone.emergencyPhone || "112"}" class="btn btn--sm btn--primary" style="font-size:0.72rem; padding:0.25rem 0.5rem; text-decoration:none;">📞 Call (${zone.emergencyPhone || "112"})</a>
            <button type="button" class="btn btn--sm btn--ghost" style="font-size:0.72rem; padding:0.25rem 0.5rem;" onclick="navigateToSafeZone('${zone._id || ""}', ${lat}, ${lng}, '${encodeURIComponent(zone.name)}')">🚶 Route</button>
          </div>
        </div>
      `;
      m.bindPopup(popupContent);
    }
  });
}

function renderNearbySafeZonesList() {
  const listEl = document.getElementById("nearby-safezones-list");
  if (!listEl) return;

  const zones = _cachedEvaluation?.nearbySafeZones || [];
  const filtered = _currentCategory === "all" ? zones : zones.filter((z) => z.category === _currentCategory);

  if (!filtered.length) {
    listEl.innerHTML = `<p style="font-size:0.8rem; color:var(--ink-light);">No safe havens in this category nearby.</p>`;
    return;
  }

  const categoryBadges = {
    police: "badge--police",
    hospital: "badge--hospital",
    hotel: "badge--hotel",
    transit: "badge--transit",
    tourist_booth: "badge--booth",
  };

  listEl.innerHTML = filtered
    .map((z) => {
      const coords = z.location?.coordinates || [];
      const lat = coords[1] || 0;
      const lng = coords[0] || 0;

      return `
        <div style="background:#ffffff; border:1px solid var(--line); border-radius:var(--radius-sm); padding:0.65rem; display:flex; flex-direction:column; gap:0.3rem; box-shadow:var(--shadow-card);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <strong style="font-size:0.85rem; color:var(--ink); line-height:1.2;">${YM.util.escapeHtml(z.name)}</strong>
            <span style="font-size:0.72rem; font-weight:700; color:var(--teal); white-space:nowrap; margin-left:0.4rem;">${z.distanceText || ""}</span>
          </div>
          <span style="font-size:0.74rem; color:var(--ink-light);">${YM.util.escapeHtml(z.address || "")}</span>
          <div style="display:flex; gap:0.35rem; margin-top:0.3rem; flex-wrap:wrap;">
            <a href="tel:${z.emergencyPhone || "112"}" class="btn btn--sm btn--primary" style="font-size:0.72rem; padding:0.25rem 0.5rem; text-decoration:none;">
              📞 Call ${z.emergencyPhone || "112"}
            </a>
            <button type="button" class="btn btn--sm btn--ghost" style="font-size:0.72rem; padding:0.25rem 0.5rem;" onclick="navigateToSafeZone('${z._id || ""}', ${lat}, ${lng}, '${encodeURIComponent(z.name)}')">
              🚶 Navigate
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

// ── 3. Turn-by-Turn Safe Route Navigation ─────────────────────────────────
window.navigateToSafeZone = async function (safeZoneId, destLat, destLng, encodedName) {
  const name = decodeURIComponent(encodedName || "Safe Haven");
  const directionsBlock = document.getElementById("safepath-route-directions");
  const destNameEl = document.getElementById("route-dest-name");
  const distEl = document.getElementById("route-total-dist");
  const timeEl = document.getElementById("route-total-time");
  const stepsContainer = document.getElementById("route-steps-container");

  if (directionsBlock) directionsBlock.hidden = false;
  if (destNameEl) destNameEl.textContent = name;
  if (stepsContainer) stepsContainer.innerHTML = `<p style="font-size:0.78rem; color:var(--ink-light);">Computing safest walking route…</p>`;

  try {
    const res = await YM.api.getSafeRoute({
      startLat: _currentUserCoords.lat,
      startLng: _currentUserCoords.lng,
      destLat,
      destLng,
      safeZoneId: safeZoneId || undefined,
    });

    const route = res.data || {};
    if (distEl) distEl.textContent = route.distanceMeters ? `${Math.round(route.distanceMeters)} meters` : "Nearby";
    if (timeEl) timeEl.textContent = route.durationMinutes ? `${route.durationMinutes} mins walk` : "Quick walk";

    // Draw Route Polyline on Leaflet
    if (_safeMap && route.geometry?.coordinates) {
      if (_routeLayer) _safeMap.removeLayer(_routeLayer);

      const latLngs = route.geometry.coordinates.map((c) => [c[1], c[0]]);
      _routeLayer = L.polyline(latLngs, {
        color: "#d32f2f",
        weight: 5,
        opacity: 0.85,
        dashArray: "8, 8",
      }).addTo(_safeMap);

      _safeMap.fitBounds(_routeLayer.getBounds(), { padding: [40, 40] });
    }

    // Populate Steps
    if (stepsContainer && Array.isArray(route.steps)) {
      stepsContainer.innerHTML = route.steps
        .map(
          (st, idx) => `
          <div class="route-step-item">
            <span style="font-weight:700; color:var(--gold);">${idx + 1}.</span>
            <span>${YM.util.escapeHtml(st.instruction)} ${st.distanceMeters ? `(${st.distanceMeters}m)` : ""}</span>
          </div>
        `
        )
        .join("");
    }
  } catch (err) {
    console.error("Route generation failed:", err);
    if (stepsContainer) {
      stepsContainer.innerHTML = `<p style="color:#d32f2f; font-size:0.78rem;">Could not load road network. Head directly towards coordinates [${destLat}, ${destLng}].</p>`;
    }
  }
};

// ── 4. NDMA SACHET Disaster Warnings Feed ──────────────────────────────────
function setupDisasterAlerts() {
  const areaFilter = document.getElementById("alert-area-filter");
  const typeFilter = document.getElementById("alert-type-filter");

  if (areaFilter) {
    areaFilter.addEventListener("input", YM.util.debounce(() => loadAlerts(), 400));
  }
  if (typeFilter) {
    typeFilter.addEventListener("change", () => loadAlerts());
  }

  loadAlerts();
}

async function loadAlerts() {
  const host = document.getElementById("alerts-list");
  if (!host) return;
  host.innerHTML = `<p class="loading-state">Loading disaster alerts…</p>`;

  const area = document.getElementById("alert-area-filter")?.value.trim();
  const type = document.getElementById("alert-type-filter")?.value;

  try {
    const res = await YM.api.getAlerts({ area: area || undefined, type: type || undefined });
    const alerts = res.data || [];
    if (!alerts.length) {
      host.innerHTML = `<p class="empty-state">No active disaster alerts match this filter right now — all clear.</p>`;
      return;
    }
    host.innerHTML = alerts.map(alertItem).join("");
  } catch (err) {
    console.error(err);
    host.innerHTML = `<p class="empty-state">Couldn't load NDMA disaster alerts.</p>`;
  }
}

function alertItem(a) {
  const effective = a.effective ? new Date(a.effective).toLocaleString() : null;
  const expires = a.expires ? new Date(a.expires).toLocaleString() : null;

  return `
    <div class="list-item" style="margin-bottom:0.75rem;">
      <div class="list-item-head">
        <span class="list-item-title">${YM.util.escapeHtml(a.headline || a.type)}</span>
        <span class="severity-tag severity-tag--${YM.util.escapeHtml(a.severity || "unknown")}">${YM.util.escapeHtml(a.severity || "unknown")}</span>
      </div>
      <p class="list-item-meta">${YM.util.escapeHtml(a.areaDescription || "")} · ${YM.util.escapeHtml((a.type || "other").replaceAll("_", " "))}</p>
      ${a.description ? `<p style="font-size:0.82rem; margin:0.3rem 0;">${YM.util.escapeHtml(a.description)}</p>` : ""}
      ${a.instruction ? `<p style="font-size:0.82rem; margin:0.3rem 0;"><strong>Instruction:</strong> ${YM.util.escapeHtml(a.instruction)}</p>` : ""}
      <p class="list-item-meta" style="font-size:0.74rem;">
        ${effective ? `Effective: ${effective}` : ""}${effective && expires ? " · " : ""}${expires ? `Expires: ${expires}` : ""}
      </p>
      ${a.sourceUrl ? `<a href="${a.sourceUrl}" target="_blank" rel="noopener" style="font-size:0.78rem;">Official source &rarr;</a>` : ""}
    </div>
  `;
}
