/**
 * config.js — single source of truth for backend location.
 * Matches tourism-backend/server.js: app.use("/api", routes), default PORT=5000.
 *
 * IMPORTANT: change API_BASE_URL when you deploy the backend somewhere other
 * than your own machine (e.g. a staging server). Nothing else in this
 * frontend needs to change.
 */
window.YM_CONFIG = {
  API_BASE_URL: "http://localhost:5000/api",
};

// Declared ONCE here, since config.js always loads first on every page.
// Every other script file (api.js, app.js, explore.js, etc.) reuses this
// same binding directly — none of them redeclare it with const/let/var.
window.YM = window.YM || {};
const YM = window.YM;
