# 05. Frontend Integration Code Patterns & Recipes

This document provides plug-and-play JavaScript code examples and patterns to integrate every backend functionality into your frontend pages.

---

## 1. Centralized API Client Module (`frontend/shared/js/api.js`)

Create this file in `frontend/shared/js/api.js` to serve as the unified bridge between UI scripts and backend APIs.

```javascript
/**
 * YatraMitra API Client (api.js)
 * Handles all network requests, JWT token attachment, and error handling.
 */
const API_BASE_URL = window.API_BASE_URL || "http://localhost:5000/api";

const api = {
  // ── Authentication Token Management ──────────────────
  getToken() {
    return localStorage.getItem("yatramitra_jwt_token");
  },

  setToken(token) {
    if (token) localStorage.setItem("yatramitra_jwt_token", token);
    else localStorage.removeItem("yatramitra_jwt_token");
  },

  getCurrentUser() {
    const userJson = localStorage.getItem("yatramitra_user_data");
    return userJson ? JSON.parse(userJson) : null;
  },

  setCurrentUser(user) {
    if (user) localStorage.setItem("yatramitra_user_data", JSON.stringify(user));
    else localStorage.removeItem("yatramitra_user_data");
  },

  // ── Core Fetch Wrapper ────────────────────────────────
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();

    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP Error ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error on [${options.method || "GET"} ${endpoint}]:`, err.message);
      throw err;
    }
  },

  // ── Authentication APIs ──────────────────────────────
  async register(name, email, password, preferredLanguage = "en") {
    const res = await this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, preferredLanguage }),
    });
    if (res.token) {
      this.setToken(res.token);
      this.setCurrentUser(res.user);
    }
    return res;
  },

  async login(email, password) {
    const res = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (res.token) {
      this.setToken(res.token);
      this.setCurrentUser(res.user);
    }
    return res;
  },

  async getMe() {
    return this.request("/auth/me");
  },

  logout() {
    this.setToken(null);
    this.setCurrentUser(null);
  },

  // ── Monument & Heritage APIs ─────────────────────────
  async getMonuments(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/monuments${query ? "?" + query : ""}`);
  },

  async getNearbyMonuments(lat, lng, radiusKm = 25) {
    return this.request(`/monuments/nearby?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`);
  },

  async getMonument(slug, lang = null) {
    const query = lang ? `?lang=${encodeURIComponent(lang)}` : "";
    return this.request(`/monuments/${encodeURIComponent(slug)}${query}`);
  },

  // ── Weather & Climate Advisory ───────────────────────
  async getWeather(lat, lng) {
    return this.request(`/weather?lat=${lat}&lng=${lng}`);
  },

  async getBestTimeAdvice(lat, lng, bestVisitMonths = []) {
    return this.request("/weather/best-time", {
      method: "POST",
      body: JSON.stringify({ lat, lng, bestVisitMonths }),
    });
  },

  // ── SACHET Disaster & Safety Alerts ───────────────────
  async getAlerts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/alerts${query ? "?" + query : ""}`);
  },

  // ── Crowd Estimation & Reporting ─────────────────────
  async getCrowdEstimate(slug) {
    return this.request(`/crowd/${encodeURIComponent(slug)}/estimate`);
  },

  async submitCrowdReport(slug, level) {
    return this.request(`/crowd/${encodeURIComponent(slug)}/report`, {
      method: "POST",
      body: JSON.stringify({ level }),
    });
  },

  // ── Bhashini Multilingual Translation & Voice AI ───────
  async getSupportedLanguages() {
    return this.request("/translate/languages");
  },

  async translateText(text, targetLanguage, sourceLanguage = "en") {
    return this.request("/translate/text", {
      method: "POST",
      body: JSON.stringify({ text, targetLanguage, sourceLanguage }),
    });
  },

  async textToSpeech(text, language, gender = "female") {
    return this.request("/translate/text-to-speech", {
      method: "POST",
      body: JSON.stringify({ text, language, gender }),
    });
  },

  // ── Health & Mobility Profile (Opt-in) ────────────────
  async getHealthProfile() {
    return this.request("/health-profile");
  },

  async saveHealthProfile(profileData) {
    return this.request("/health-profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  },

  async getRecommendationFlags() {
    return this.request("/health-profile/recommendation-flags");
  },

  // ── Festivals Calendar ────────────────────────────────
  async getActiveFestivals(state = null) {
    const query = state ? `?state=${encodeURIComponent(state)}` : "";
    return this.request(`/festivals/active${query}`);
  },
};
```

---

## 2. Dynamic Destinations Grid Recipe (`index.html`)

Replace static JSON parsing in `frontend/standard/js/standard.js` with this dynamic handler:

```javascript
async function renderDestinationGrid() {
  const grid = document.getElementById("destination-grid");
  if (!grid) return;

  grid.innerHTML = `<p style="color:var(--ink-soft);">Discovering incredible heritage sites…</p>`;

  try {
    // Fetch underexplored destinations from database
    const response = await api.getMonuments({ underexplored: "true", limit: 6 });
    const monuments = response.data || [];

    if (monuments.length === 0) {
      grid.innerHTML = `<p style="color:var(--ink-soft);">No destinations found.</p>`;
      return;
    }

    grid.innerHTML = monuments.map(monumentCardTemplate).join("");
  } catch (err) {
    grid.innerHTML = `<p style="color:var(--ink-soft);">Unable to load live destinations. Please check your backend connection.</p>`;
  }
}

function monumentCardTemplate(m) {
  // GeoJSON coordinates are [lng, lat]
  const [lng, lat] = m.location?.coordinates || [0, 0];
  const imageUrl = m.images?.[0] || "../shared/assets/placeholder.jpg";

  return `
    <article class="card">
      <div class="card-arch"><span>${escapeHtml(m.state || m.district || "India")}</span></div>
      <div class="card-body">
        <h3>${escapeHtml(m.name)}</h3>
        <p>${escapeHtml(m.shortDescription || "")}</p>
        <div class="card-meta" style="font-size:0.8rem; color:var(--ink-soft); margin-bottom:12px;">
          ${m.category ? `<span class="badge">${escapeHtml(m.category)}</span>` : ""}
          ${m.entryFee?.indian !== undefined ? `<span>₹${m.entryFee.indian} entry</span>` : ""}
        </div>
        <a class="card-link" href="monument.html?slug=${encodeURIComponent(m.slug)}">View details &rarr;</a>
      </div>
    </article>
  `;
}
```

---

## 3. Interactive Leaflet Map Recipe (`explore.html`)

Update the map initialization to plot real GPS coordinates directly from the backend:

```javascript
async function initExploreMap() {
  const mapEl = document.getElementById("map");
  if (!mapEl || typeof L === "undefined") return;

  // Center on India
  const map = L.map("map").setView([22.5, 80], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(map);

  const markersGroup = L.featureGroup().addTo(map);

  try {
    const response = await api.getMonuments({ limit: 100 });
    const monuments = response.data || [];

    monuments.forEach((m) => {
      if (!m.location?.coordinates || m.location.coordinates.length < 2) return;

      const [lng, lat] = m.location.coordinates; // MongoDB GeoJSON is [lng, lat]

      const marker = L.marker([lat, lng]);
      marker.bindPopup(`
        <div style="font-family:inherit; min-width:180px;">
          <h4 style="margin:0 0 4px; font-size:1.05rem;">${escapeHtml(m.name)}</h4>
          <p style="margin:0 0 6px; font-size:0.85rem; color:#666;">${escapeHtml(m.state)}</p>
          <p style="margin:0 0 10px; font-size:0.82rem;">${escapeHtml(m.shortDescription?.slice(0, 100) || "")}...</p>
          <a href="monument.html?slug=${encodeURIComponent(m.slug)}" style="color:#9C4A2E; font-weight:600; text-decoration:none;">View Full Guide &rarr;</a>
        </div>
      `);
      markersGroup.addLayer(marker);
    });

    if (monuments.length > 0) {
      map.fitBounds(markersGroup.getBounds(), { padding: [40, 40] });
    }
  } catch (err) {
    console.error("Failed to load map markers:", err);
  }
}
```

---

## 4. Full Monument Detail Page & Widgets (`monument.html`)

```javascript
async function renderMonumentDetail() {
  const container = document.getElementById("monument-detail");
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get("slug") || urlParams.get("id"); // backward compatibility

  if (!slug) {
    container.innerHTML = `<p>No monument specified. <a href="explore.html">Back to explore</a></p>`;
    return;
  }

  try {
    const res = await api.getMonument(slug);
    const m = res.data;

    document.title = `${m.name} — Vistaara`;
    document.getElementById("monument-name").textContent = m.name;
    document.getElementById("monument-region").textContent = `${m.state}${m.district ? ` · ${m.district}` : ""}`;
    document.getElementById("monument-tagline").textContent = m.shortDescription;

    // 1. Render Safety Alert Banner if region has alerts
    loadSafetyAlerts(m.state);

    // 2. Render Live Crowd Status Badge
    loadCrowdIndicator(m.slug);

    // 3. Render Live Weather & Seasonal Guide
    if (m.location?.coordinates) {
      const [lng, lat] = m.location.coordinates;
      loadWeatherWidget(lat, lng, m.timings?.bestVisitMonths);
    }

    // 4. Attach Audio Narration (TTS)
    setupAudioGuide(m.history || m.shortDescription, "hi");

  } catch (err) {
    container.innerHTML = `<p>Couldn't load destination details. <a href="explore.html">Return to explore</a></p>`;
  }
}

// ── Real-Time Crowd Badge ──────────────────────────────
async function loadCrowdIndicator(slug) {
  const badgeEl = document.getElementById("crowd-status-badge");
  if (!badgeEl) return;

  try {
    const crowd = await api.getCrowdEstimate(slug);
    const colors = {
      low: "#2e7d32",
      moderate: "#f57c00",
      high: "#d32f2f",
      very_high: "#b71c1c",
    };
    badgeEl.style.backgroundColor = colors[crowd.level] || "#555";
    badgeEl.textContent = `Crowd Level: ${crowd.level.toUpperCase()} (${crowd.confidence} confidence)`;
  } catch (e) {
    badgeEl.textContent = "Crowd data unavailable";
  }
}

// ── SACHET Disaster Banner ─────────────────────────────
async function loadSafetyAlerts(state) {
  const alertContainer = document.getElementById("safety-alert-banner");
  if (!alertContainer) return;

  try {
    const res = await api.getAlerts({ area: state });
    if (res.data && res.data.length > 0) {
      const alert = res.data[0];
      alertContainer.style.display = "block";
      alertContainer.innerHTML = `
        <div style="background:#fde8e8; border-left:4px solid #d32f2f; padding:12px 16px; margin-bottom:20px;">
          <strong style="color:#d32f2f;">⚠️ Safety Alert (${alert.type.toUpperCase()}):</strong>
          <p style="margin:4px 0 0; color:#333;">${escapeHtml(alert.headline)}</p>
        </div>
      `;
    }
  } catch (e) {
    console.warn("Could not load safety alerts:", e);
  }
}

// ── Bhashini Audio Guide ───────────────────────────────
function setupAudioGuide(narrativeText, lang = "hi") {
  const audioBtn = document.getElementById("play-audio-btn");
  if (!audioBtn) return;

  audioBtn.addEventListener("click", async () => {
    audioBtn.textContent = "Generating audio guide...";
    audioBtn.disabled = true;

    try {
      const tts = await api.textToSpeech(narrativeText.slice(0, 300), lang);
      if (tts.audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${tts.audioBase64}`);
        audio.play();
        audioBtn.textContent = "🔊 Playing Audio Guide";
        audio.onended = () => {
          audioBtn.textContent = "🎧 Listen to Audio Guide";
          audioBtn.disabled = false;
        };
      }
    } catch (e) {
      alert("Audio guide currently unavailable in this language.");
      audioBtn.textContent = "🎧 Listen to Audio Guide";
      audioBtn.disabled = false;
    }
  });
}
```
