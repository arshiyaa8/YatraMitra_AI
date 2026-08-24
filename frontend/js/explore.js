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

document.addEventListener("DOMContentLoaded", () => {
  if (!YM.nationality.require()) return;

  YM.renderHeader("explore");
  YM.renderAlertBanner("alert-banner-host");
  YM.renderFestivalBanner("festival-banner-host");
  checkPersonalization();
  initExploreMap();
  setupViewSwitcher();

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

  document.getElementById("underexplored-toggle").addEventListener("change", (e) => {
    state.nearbyMode = false;
    state.underexplored = e.target.checked;
    state.page = 1;
    loadMonuments();
  });

  document.getElementById("near-me-btn").addEventListener("click", loadNearby);

  loadMonuments();
});

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
}

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
    const feeLabel = fee === 0 ? "Free entry" : fee ? `${m.entryFee.currency || "INR"} ${fee}` : "";

    const marker = L.marker([lat, lng]);
    marker.bindPopup(`
      <div class="map-popup-card">
        <div class="map-popup-arch">${YM.util.escapeHtml(m.category || "monument")}</div>
        <div style="padding: 0.6rem 0.2rem 0;">
          <h4>${YM.util.escapeHtml(m.name)}</h4>
          <p>${YM.util.escapeHtml(m.state)}${m.district ? ` · ${YM.util.escapeHtml(m.district)}` : ""}</p>
          ${feeLabel ? `<div style="font-size:0.78rem; color:var(--maroon); font-weight:600; margin-bottom:0.4rem;">${YM.util.escapeHtml(feeLabel)}</div>` : ""}
          <a class="map-popup-link" href="monument.html?slug=${encodeURIComponent(m.slug)}" onclick="sessionStorage.setItem('ym_selected_monument', '${YM.util.escapeHtml(m.slug)}')">View Full Guide &rarr;</a>
        </div>
      </div>
    `);
    markerGroup.addLayer(marker);
  });

  if (validItems.length > 0 && state.viewMode === "map") {
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
  status.textContent = "Loading…";
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
    items.forEach((m) => state.knownStates.add(m.state));
    populateStateFilter();

    renderGrid(grid, items);
    renderMapMarkers(items);

    status.textContent = `${res.total} destination${res.total === 1 ? "" : "s"} found`;
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

        renderGrid(grid, items);
        renderMapMarkers(items);

        // Center map directly on user's current GPS position
        if (exploreMap) {
          exploreMap.setView([pos.coords.latitude, pos.coords.longitude], 9);
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
    fee === 0 ? "Free entry" : fee ? `${m.entryFee.currency || "INR"} ${fee} entry` : "";

  const isAccessible = (m.accessibility?.tags || []).includes("wheelchair_accessible");
  const imgUrl = m.images && m.images.length > 0 ? m.images[0] : null;

  return `
    <article class="card" style="overflow:hidden; display:flex; flex-direction:column;">
      <div class="card-arch" style="${imgUrl ? `background-image: linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.65) 100%), url('${imgUrl}'); background-size: cover; background-position: center; min-height: 140px; position:relative;` : ""}" aria-hidden="true">
        <span class="card-arch-label" style="${imgUrl ? "background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);" : ""}">${YM.util.escapeHtml(m.category || "monument")}</span>
      </div>
      <div class="card-body" style="flex:1; display:flex; flex-direction:column;">
        <h3>${YM.util.escapeHtml(m.name)}</h3>
        <p class="card-meta">${YM.util.escapeHtml(m.state)}${m.district ? `, ${YM.util.escapeHtml(m.district)}` : ""}</p>
        <p class="card-desc">${YM.util.escapeHtml(m.shortDescription || "")}</p>
        <div class="card-footer" style="margin-top:auto; padding-top:0.6rem;">
          ${feeLabel ? `<span class="badge badge--fee">${YM.util.escapeHtml(feeLabel)}</span>` : ""}
          ${m.isUnderexplored ? `<span class="badge badge--underexplored">Underexplored gem</span>` : ""}
          ${accessibilityFlagged && isAccessible ? `<span class="badge badge--accessible">Matches your accessibility needs</span>` : ""}
        </div>
        <a class="card-link" href="monument.html?slug=${encodeURIComponent(m.slug)}" onclick="sessionStorage.setItem('ym_selected_monument', '${YM.util.escapeHtml(m.slug)}')">View details &rarr;</a>
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
