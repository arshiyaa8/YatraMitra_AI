/**
 * account.js — login, register, profile preferences, opt-in health/accessibility
 * profile, and the local trip list. Talks to /api/auth/*, /api/health-profile/*.
 */

// Matches tourism-backend/src/config/constants.js ACCESSIBILITY_TAGS exactly.
const ACCESSIBILITY_TAGS = [
  "wheelchair_accessible",
  "elderly_friendly",
  "audio_guide_available",
  "braille_signage",
  "step_free_access",
  "rest_areas_available",
];

// Matches the example interest values in tourism-backend/src/models/User.js.
const INTEREST_OPTIONS = ["heritage", "food", "wildlife", "adventure"];

let selectedInterests = new Set();
let selectedAccessibility = new Set();

document.addEventListener("DOMContentLoaded", () => {
  YM.renderHeader("account");

  if (YM.auth.isLoggedIn()) {
    showLoggedIn();
  } else {
    setupTabs();
    setupLoginForm();
    setupRegisterForm();
  }
});

function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("tab-btn--active"));
      btn.classList.add("tab-btn--active");
      const tab = btn.getAttribute("data-tab");
      document.getElementById("login-form").hidden = tab !== "login";
      document.getElementById("register-form").hidden = tab !== "register";
    });
  });
}

function setupLoginForm() {
  const form = document.getElementById("login-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("login-status");
    status.textContent = "Logging in…";
    try {
      const res = await YM.api.login({
        email: document.getElementById("login-email").value,
        password: document.getElementById("login-password").value,
      });
      YM.auth.save(res.token, res.user);
      window.location.href = "explore.html";
    } catch (err) {
      status.textContent = err.message;
    }
  });
}

function setupRegisterForm() {
  const form = document.getElementById("register-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("register-status");
    status.textContent = "Creating account…";
    try {
      const res = await YM.api.register({
        name: document.getElementById("register-name").value,
        email: document.getElementById("register-email").value,
        password: document.getElementById("register-password").value,
        preferredLanguage: YM.lang.get(),
      });
      YM.auth.save(res.token, res.user);
      window.location.href = "explore.html";
    } catch (err) {
      status.textContent = err.message;
    }
  });
}

async function showLoggedIn() {
  document.getElementById("auth-forms").hidden = true;
  const view = document.getElementById("logged-in-view");
  view.hidden = false;

  const user = YM.auth.getUser();
  renderAccountSummary(user);
  await loadProfileForm();
  renderTripList();
  setupRoutePlanner();
  setupHealthChips();

  document.getElementById("profile-save-btn").addEventListener("click", saveProfile);
  document.getElementById("health-save-btn").addEventListener("click", saveHealthProfile);
  document.getElementById("health-clear-btn").addEventListener("click", clearHealthProfile);
  document.getElementById("logout-btn").addEventListener("click", () => YM.auth.logout());

  loadHealthProfile();
  loadRecommendationFlags();
}

function renderAccountSummary(user) {
  const details = document.getElementById("account-details");
  details.innerHTML = `
    <div><dt>Name</dt><dd>${YM.util.escapeHtml(user.name)}</dd></div>
    <div><dt>Email</dt><dd>${YM.util.escapeHtml(user.email)}</dd></div>
    <div><dt>Preferred language</dt><dd>${YM.util.escapeHtml(user.preferredLanguage || "en")}</dd></div>
    <div><dt>Visitor type</dt><dd>${YM.util.escapeHtml(YM.nationality.label() || "Not set")}</dd></div>
  `;
}

async function loadProfileForm() {
  document.getElementById("profile-name").value = "";
  const langSelect = document.getElementById("profile-lang");

  try {
    const [langsRes, meRes] = await Promise.all([YM.api.listLanguages(), YM.api.getMe()]);
    const langs = langsRes.data || {};
    langSelect.innerHTML = Object.entries(langs)
      .map(([code, info]) => `<option value="${code}">${YM.util.escapeHtml(info.name)}</option>`)
      .join("");

    const user = meRes.user;
    document.getElementById("profile-name").value = user.name || "";
    langSelect.value = user.preferredLanguage || "en";

    selectedInterests = new Set(user.preferences?.interests || []);
    selectedAccessibility = new Set(user.preferences?.accessibilityNeeds || []);
    renderChips("interest-chips", INTEREST_OPTIONS, selectedInterests);
    renderChips("accessibility-chips", ACCESSIBILITY_TAGS, selectedAccessibility);
  } catch (err) {
    console.error("Couldn't load profile:", err);
  }
}

function renderChips(hostId, options, selectedSet) {
  const host = document.getElementById(hostId);
  host.innerHTML = options
    .map(
      (opt) => `
      <button type="button" class="chip-toggle${selectedSet.has(opt) ? " chip-toggle--active" : ""}" data-value="${opt}">
        ${YM.util.escapeHtml(opt.replaceAll("_", " "))}
      </button>`
    )
    .join("");

  host.querySelectorAll(".chip-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.getAttribute("data-value");
      if (selectedSet.has(value)) {
        selectedSet.delete(value);
        btn.classList.remove("chip-toggle--active");
      } else {
        selectedSet.add(value);
        btn.classList.add("chip-toggle--active");
      }
    });
  });
}

async function saveProfile() {
  const status = document.getElementById("profile-status");
  status.textContent = "Saving…";
  try {
    const res = await YM.api.updateMe({
      name: document.getElementById("profile-name").value.trim(),
      preferredLanguage: document.getElementById("profile-lang").value,
      preferences: {
        interests: Array.from(selectedInterests),
        accessibilityNeeds: Array.from(selectedAccessibility),
      },
    });
    YM.auth.save(YM.auth.getToken(), res.user);
    YM.lang.set(res.user.preferredLanguage);
    renderAccountSummary(res.user);
    status.textContent = "Profile saved.";
  } catch (err) {
    status.textContent = `Couldn't save: ${err.message}`;
  }
}

// ── Health / accessibility profile (opt-in, encrypted at rest) ─────────────
function setupHealthChips() {
  const containerIds = ["health-mobility-chips", "health-condition-chips", "health-allergy-chips"];
  containerIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", (e) => {
      const btn = e.target.closest("button.chip");
      if (btn) {
        btn.classList.toggle("chip-toggle--active");
      }
    });
  });
}

async function loadHealthProfile() {
  try {
    const res = await YM.api.getHealthProfile();
    if (res.optedIn && res.data) {
      const { allergies = [], conditions = [], mobilityNeeds = [], notes = "" } = res.data;

      // Set active chips for mobility
      document.querySelectorAll("#health-mobility-chips button.chip").forEach((btn) => {
        const val = btn.getAttribute("data-val");
        if (mobilityNeeds.includes(val)) {
          btn.classList.add("chip-toggle--active");
        } else {
          btn.classList.remove("chip-toggle--active");
        }
      });

      // Set active chips for conditions
      document.querySelectorAll("#health-condition-chips button.chip").forEach((btn) => {
        const val = btn.getAttribute("data-val");
        if (conditions.includes(val)) {
          btn.classList.add("chip-toggle--active");
        } else {
          btn.classList.remove("chip-toggle--active");
        }
      });

      // Set active chips for allergies
      document.querySelectorAll("#health-allergy-chips button.chip").forEach((btn) => {
        const val = btn.getAttribute("data-val");
        if (allergies.includes(val)) {
          btn.classList.add("chip-toggle--active");
        } else {
          btn.classList.remove("chip-toggle--active");
        }
      });

      document.getElementById("health-notes").value = notes;
    }
  } catch (err) {
    console.error("Couldn't load health profile:", err);
  }
}

async function saveHealthProfile() {
  const status = document.getElementById("health-status");
  status.textContent = "Saving preferences…";

  const getSelectedVals = (containerId) =>
    Array.from(document.querySelectorAll(`#${containerId} button.chip-toggle--active`)).map((b) =>
      b.getAttribute("data-val")
    );

  const mobilityNeeds = getSelectedVals("health-mobility-chips");
  const conditions = getSelectedVals("health-condition-chips");
  const allergies = getSelectedVals("health-allergy-chips");
  const notes = document.getElementById("health-notes").value.trim();

  try {
    await YM.api.setHealthProfile({
      mobilityNeeds,
      conditions,
      allergies,
      notes,
    });
    status.textContent = "Saved — AES-256 encrypted under DPDP Act 2023.";
    loadRecommendationFlags();
  } catch (err) {
    status.textContent = `Couldn't save: ${err.message}`;
  }
}

async function clearHealthProfile() {
  const status = document.getElementById("health-status");
  status.textContent = "Clearing preferences…";
  try {
    await YM.api.clearHealthProfile();
    document
      .querySelectorAll("#health-profile-panel button.chip-toggle--active")
      .forEach((b) => b.classList.remove("chip-toggle--active"));
    document.getElementById("health-notes").value = "";
    status.textContent = "Preferences cleared.";
    loadRecommendationFlags();
  } catch (err) {
    status.textContent = `Couldn't clear: ${err.message}`;
  }
}

async function loadRecommendationFlags() {
  const host = document.getElementById("recommendation-flags");
  try {
    const res = await YM.api.getRecommendationFlags();
    const flags = res.flags || [];
    if (!flags.length) {
      host.innerHTML = "";
      return;
    }
    const flagLabels = {
      prefer_wheelchair_accessible_sites: "♿ Prioritizing Wheelchair & Step-Free Sites",
      avoid_high_heat_high_exertion_slots: "☀️ High-Heat Afternoon Warnings Active",
      filter_food_recommendations_by_allergy: "🍲 Food Allergy Safety Filtering Active",
    };
    host.innerHTML = `
      <p class="widget-sub" style="font-weight:600; color:var(--teal-dark); margin-bottom:0.4rem;">Active Personalization Flags:</p>
      <ul class="chip-list">${flags
        .map((f) => `<li class="chip" style="background:var(--teal-dim); color:var(--teal-dark); border-color:var(--teal);">${YM.util.escapeHtml(flagLabels[f] || f.replaceAll("_", " "))}</li>`)
        .join("")}</ul>
    `;
  } catch {
    host.innerHTML = "";
  }
}

// ── My trip & Route Optimizer ──────────────────────────────────────────
let itineraryMap = null;
let itineraryLayerGroup = null;

function renderTripList() {
  const host = document.getElementById("trip-destinations-list");
  if (!host) return;

  const slugs = YM.trip.get();
  if (!slugs.length) {
    host.innerHTML = `<p class="widget-sub" style="font-style:italic;">No destinations added yet. Choose a preset circuit above or add sites from the Explore page.</p>`;
    return;
  }

  host.innerHTML = `<ul class="chip-list">` + slugs
    .map(
      (slug) =>
        `<li class="chip" style="display:inline-flex; align-items:center;">
          <a href="monument.html?slug=${encodeURIComponent(slug)}" style="color:inherit; text-decoration:none;">${YM.util.escapeHtml(slug.replaceAll("-", " "))}</a>
          <button type="button" class="trip-chip-remove" data-slug="${YM.util.escapeHtml(slug)}" title="Remove from trip">&times;</button>
        </li>`
    )
    .join("") + `</ul>`;

  // Attach individual remove handlers
  host.querySelectorAll(".trip-chip-remove").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const slug = btn.getAttribute("data-slug");
      YM.trip.toggle(slug);
      renderTripList();
    });
  });
}

function setupRoutePlanner() {
  const presetContainer = document.getElementById("circuit-presets");
  const optimizeBtn = document.getElementById("optimize-route-btn");
  const clearBtn = document.getElementById("clear-trip-btn");
  const statusEl = document.getElementById("route-status");
  const resultsContainer = document.getElementById("route-results");

  // Preset Circuits
  if (presetContainer) {
    presetContainer.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-circuit]");
      if (!btn) return;
      const circuit = btn.getAttribute("data-circuit");

      const circuits = {
        agra: ["taj-mahal", "agra-fort", "fatehpur-sikri"],
        delhi: ["qutub-minar", "red-fort", "humayuns-tomb"],
        karnataka: ["hampi-ruins", "pattadakal", "badami-caves"],
      };

      const selected = circuits[circuit] || [];
      selected.forEach((slug) => {
        if (!YM.trip.has(slug)) YM.trip.toggle(slug);
      });
      renderTripList();
      statusEl.textContent = `Loaded ${btn.textContent.trim()} preset!`;
    });
  }

  // Clear All
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      localStorage.setItem("ym_trip", JSON.stringify([]));
      renderTripList();
      if (resultsContainer) resultsContainer.hidden = true;
      statusEl.textContent = "Trip list cleared.";
    });
  }

  // Optimize Route Button
  if (optimizeBtn) {
    optimizeBtn.addEventListener("click", async () => {
      const slugs = YM.trip.get();
      if (slugs.length < 2) {
        statusEl.textContent = "Please add at least 2 destinations to plan an itinerary.";
        return;
      }

      statusEl.textContent = "Calculating optimal route and travel times…";
      optimizeBtn.disabled = true;

      try {
        const res = await YM.api.optimizeRoute({ waypoints: slugs });
        statusEl.textContent = "";
        resultsContainer.hidden = false;

        // Stats
        document.getElementById("route-total-distance").textContent = `${res.totalDistanceKm} km`;
        document.getElementById("route-total-time").textContent = res.formattedDuration;

        // Step-by-Step Timeline
        const timelineEl = document.getElementById("route-timeline");
        timelineEl.innerHTML = res.route
          .map((stop, idx) => {
            const leg = res.legs[idx]; // leg leading to the next stop
            return `
              <li class="timeline-step">
                <strong>${stop.step}. ${YM.util.escapeHtml(stop.name)}</strong>
                <span style="color:var(--ink-soft); font-size:0.85rem;"> · ${YM.util.escapeHtml(stop.state || "")}</span>
                ${
                  leg
                    ? `<div><span class="leg-badge">🚗 Drive ${leg.distanceKm} km (~${leg.formattedDuration}) to ${YM.util.escapeHtml(leg.to)}</span></div>`
                    : ""
                }
              </li>
            `;
          })
          .join("");

        // Render Leaflet Itinerary Map
        renderItineraryMap(res.route);
      } catch (err) {
        statusEl.textContent = `Route optimization failed: ${err.message}`;
      } finally {
        optimizeBtn.disabled = false;
      }
    });
  }
}

function renderItineraryMap(routeStops) {
  const mapEl = document.getElementById("itinerary-map");
  if (!mapEl || typeof L === "undefined") return;

  if (!itineraryMap) {
    itineraryMap = L.map("itinerary-map").setView([20.5937, 78.9629], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(itineraryMap);
    itineraryLayerGroup = L.featureGroup().addTo(itineraryMap);
  }

  itineraryLayerGroup.clearLayers();

  const latLngs = [];

  routeStops.forEach((stop) => {
    if (typeof stop.lat === "number" && typeof stop.lng === "number") {
      latLngs.push([stop.lat, stop.lng]);

      const marker = L.marker([stop.lat, stop.lng]);
      marker.bindPopup(`
        <div style="padding:0.4rem 0.2rem; min-width:140px;">
          <strong style="color:var(--maroon); font-size:0.95rem;">Stop ${stop.step}: ${YM.util.escapeHtml(stop.name)}</strong>
          <p style="margin:0.2rem 0 0.4rem; font-size:0.82rem; color:var(--ink-soft);">${YM.util.escapeHtml(stop.state || "")}</p>
          ${stop.slug && stop.slug !== "start" ? `<a href="monument.html?slug=${encodeURIComponent(stop.slug)}" style="color:var(--maroon); font-weight:600; font-size:0.85rem;">View Guide &rarr;</a>` : ""}
        </div>
      `);
      itineraryLayerGroup.addLayer(marker);
    }
  });

  // Draw connecting route polyline
  if (latLngs.length > 1) {
    const polyline = L.polyline(latLngs, {
      color: "#800000", // YatraMitra Heritage Maroon
      weight: 4,
      opacity: 0.85,
      dashArray: "6, 8",
    });
    itineraryLayerGroup.addLayer(polyline);
  }

  setTimeout(() => {
    itineraryMap.invalidateSize();
    if (latLngs.length > 0) {
      itineraryMap.fitBounds(itineraryLayerGroup.getBounds(), { padding: [40, 40], maxZoom: 14 });
    }
  }, 100);
}
