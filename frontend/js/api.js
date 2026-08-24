/**
 * api.js — thin wrapper around fetch, one function per backend endpoint.
 *
 * Every endpoint below matches a real route in tourism-backend/src/routes/*.
 * Nothing in this file calls anything that doesn't already exist server-side —
 * if a feature needs an endpoint the backend doesn't have, it's flagged in
 * INTEGRATION-NOTES.md instead of being faked here.
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
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const message = data?.message || data?.errors?.[0]?.msg || `Request failed (${res.status})`;
      const err = new Error(message);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  return {
    // ── Monuments — monumentRoutes.js ──────────────────────────────
    listMonuments: ({ state, category, underexplored, search, page, limit } = {}) =>
      request("/monuments", { query: { state, category, underexplored, search, page, limit } }),

    getMonument: (slug, lang) => request(`/monuments/${encodeURIComponent(slug)}`, { query: { lang } }),

    getNearby: ({ lat, lng, radiusKm } = {}) => request("/monuments/nearby", { query: { lat, lng, radiusKm } }),

    getOfflinePackage: (slugs) => request("/monuments/offline-package", { method: "POST", body: { slugs } }),

    askMonumentQuestion: (slug, question) =>
      request(`/monuments/${encodeURIComponent(slug)}/ask`, { method: "POST", body: { question } }),

    addHeritageArchiveEntry: (slug, { title, narratorName, audioUrl, transcript, language }) =>
      request(`/monuments/${encodeURIComponent(slug)}/heritage-archive`, {
        method: "POST",
        auth: true,
        body: { title, narratorName, audioUrl, transcript, language },
      }),

    // ── Translate — translateRoutes.js ─────────────────────────────
    listLanguages: () => request("/translate/languages"),

    translateText: ({ text, sourceLanguage, targetLanguage }) =>
      request("/translate/text", { method: "POST", body: { text, sourceLanguage, targetLanguage } }),

    speechToText: ({ audioBase64, language, audioFormat }) =>
      request("/translate/speech-to-text", { method: "POST", body: { audioBase64, language, audioFormat } }),

    textToSpeech: ({ text, language, gender }) =>
      request("/translate/text-to-speech", { method: "POST", body: { text, language, gender } }),

    characterVoice: ({ text, voiceName }) =>
      request("/translate/character-voice", { method: "POST", auth: true, body: { text, voiceName } }),

    reportBadTranslation: ({ text, language, context }) =>
      request("/translate/feedback", { method: "POST", auth: true, body: { text, language, context } }),

    // ── Weather — weatherRoutes.js ──────────────────────────────────
    getWeather: ({ lat, lng } = {}) => request("/weather", { query: { lat, lng } }),

    getBestTimeAdvice: ({ lat, lng, bestVisitMonths }) =>
      request("/weather/best-time", { method: "POST", body: { lat, lng, bestVisitMonths } }),

    // ── Alerts — alertRoutes.js ──────────────────────────────────────
    getAlerts: ({ area, type } = {}) => request("/alerts", { query: { area, type } }),

    // ── Crowd — crowdRoutes.js ────────────────────────────────────────
    getCrowdEstimate: (slug) => request(`/crowd/${encodeURIComponent(slug)}/estimate`),

    submitCrowdReport: (slug, level) =>
      request(`/crowd/${encodeURIComponent(slug)}/report`, { method: "POST", auth: true, body: { level } }),

    // ── Festivals — festivalRoutes.js ──────────────────────────────────
    getActiveFestivals: ({ state } = {}) => request("/festivals/active", { query: { state } }),
    getUpcomingFestivals: ({ state, days } = {}) => request("/festivals/upcoming", { query: { state, days } }),

    // ── Laws & Culture — lawRoutes.js ──────────────────────────────────
    getLaws: ({ state } = {}) => request("/laws", { query: { state } }),

    // ── Routes & Itinerary — routeRoutes.js ────────────────────────────
    optimizeRoute: ({ startLocation, waypoints } = {}) =>
      request("/routes/optimize", { method: "POST", body: { startLocation, waypoints } }),

    // ── Auth — authRoutes.js ───────────────────────────────────────────
    register: ({ name, email, password, preferredLanguage }) =>
      request("/auth/register", { method: "POST", body: { name, email, password, preferredLanguage } }),

    login: ({ email, password }) => request("/auth/login", { method: "POST", body: { email, password } }),

    getMe: () => request("/auth/me", { auth: true }),

    updateMe: ({ name, preferredLanguage, preferences }) =>
      request("/auth/me", { method: "PATCH", auth: true, body: { name, preferredLanguage, preferences } }),

    // ── Health / accessibility profile — healthRoutes.js (opt-in, encrypted at rest) ──
    getHealthProfile: () => request("/health-profile", { auth: true }),
    setHealthProfile: ({ allergies, conditions, mobilityNeeds, notes }) =>
      request("/health-profile", { method: "PUT", auth: true, body: { allergies, conditions, mobilityNeeds, notes } }),
    clearHealthProfile: () => request("/health-profile", { method: "DELETE", auth: true }),
    getRecommendationFlags: () => request("/health-profile/recommendation-flags", { auth: true }),

    // ── AI Voice Assistant — aiAssistantRoutes.js ────────────────────
    askAssistant: (message, language) =>
      request("/assistant/chat", { method: "POST", body: { message, language } }),
  };
})();
