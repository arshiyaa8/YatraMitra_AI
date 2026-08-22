/**
 * api.js — thin wrapper around fetch, one function per backend endpoint.
 * Every endpoint here matches an existing route in tourism-backend/src/routes/*.
 * Nothing in this file calls anything that doesn't already exist server-side.
 */

// NOTE: YM is already declared (const) by config.js, which loads before this
// file on every page — do not redeclare it here, just use it directly below.

YM.api = (() => {
  const BASE = window.YM_CONFIG.API_BASE_URL;

  async function request(path, { method = "GET", body, auth = false, query } = {}) {
    let url = `${BASE}${path}`;
    if (query) {
      const qs = new URLSearchParams(
        Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== "")
      ).toString();
      if (qs) url += `?${qs}`;
    }

    const headers = { "Content-Type": "application/json" };
    if (auth) {
      const token = YM.auth.getToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const message = data?.message || `Request failed (${res.status})`;
      throw new Error(message);
    }
    return data;
  }

  return {
    // ── Monuments — monumentRoutes.js ────────────────────────────
    listMonuments: ({ state, category, underexplored, search, page, limit } = {}) =>
      request("/monuments", { query: { state, category, underexplored, search, page, limit } }),

    getMonument: (slug, lang) => request(`/monuments/${encodeURIComponent(slug)}`, { query: { lang } }),

    getNearby: ({ lat, lng, radiusKm } = {}) => request("/monuments/nearby", { query: { lat, lng, radiusKm } }),

    // ── Translate — translateRoutes.js ───────────────────────────
    listLanguages: () => request("/translate/languages"),

    translateText: ({ text, sourceLanguage, targetLanguage }) =>
      request("/translate/text", { method: "POST", body: { text, sourceLanguage, targetLanguage } }),

    // ── Weather — weatherRoutes.js ────────────────────────────────
    getWeather: ({ lat, lng } = {}) => request("/weather", { query: { lat, lng } }),

    getBestTimeAdvice: ({ lat, lng, bestVisitMonths }) =>
      request("/weather/best-time", { method: "POST", body: { lat, lng, bestVisitMonths } }),

    // ── Alerts — alertRoutes.js ────────────────────────────────────
    getAlerts: ({ area, type } = {}) => request("/alerts", { query: { area, type } }),

    // ── Crowd — crowdRoutes.js ──────────────────────────────────────
    getCrowdEstimate: (slug) => request(`/crowd/${encodeURIComponent(slug)}/estimate`),

    submitCrowdReport: (slug, level) =>
      request(`/crowd/${encodeURIComponent(slug)}/report`, { method: "POST", auth: true, body: { level } }),

    // ── Festivals — festivalRoutes.js ────────────────────────────────
    getActiveFestivals: ({ state } = {}) => request("/festivals/active", { query: { state } }),
    getUpcomingFestivals: ({ state, days } = {}) => request("/festivals/upcoming", { query: { state, days } }),

    // ── Auth — authRoutes.js ─────────────────────────────────────────
    register: ({ name, email, password, preferredLanguage }) =>
      request("/auth/register", { method: "POST", body: { name, email, password, preferredLanguage } }),

    login: ({ email, password }) => request("/auth/login", { method: "POST", body: { email, password } }),

    getMe: () => request("/auth/me", { auth: true }),
  };
})();