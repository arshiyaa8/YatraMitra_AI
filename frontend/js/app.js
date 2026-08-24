/**
 * app.js — shared across every page: nationality gate, auth state, preferred
 * language, the local "my trip" list, the header + mobile bottom nav, and the
 * live alert/festival banners (all backed by real API calls).
 */

// NOTE: YM is already declared (const) by config.js, which loads before this
// file on every page — do not redeclare it here, just use it directly below.

// ── Storage keys ────────────────────────────────────────────────────
const NATIONALITY_KEY = "ym_nationality"; // "indian" | "foreigner"
const TOKEN_KEY = "ym_token";
const USER_KEY = "ym_user";
const LANG_KEY = "ym_lang";
const TRIP_KEY = "ym_trip"; // array of monument slugs, this device only — see note below

// ── Utilities ────────────────────────────────────────────────────────
YM.util = {
  escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  },
  debounce(fn, wait = 300) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  },
  qs(name) {
    return new URLSearchParams(window.location.search).get(name);
  },
};

// ── Nationality gate ───────────────────────────────────────────────
YM.nationality = {
  get() {
    return localStorage.getItem(NATIONALITY_KEY);
  },
  set(value) {
    localStorage.setItem(NATIONALITY_KEY, value);
  },
  clear() {
    localStorage.removeItem(NATIONALITY_KEY);
  },
  label() {
    const v = this.get();
    return v === "indian" ? "Indian visitor" : v === "foreigner" ? "Foreign visitor" : "";
  },
  /** Call on every page except index.html. Redirects home if no choice was made yet. */
  require() {
    if (!this.get()) {
      window.location.href = "index.html";
      return false;
    }
    return true;
  },
};

// ── Auth state (talks to /api/auth via api.js) ───────────────────────
YM.auth = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  getUser() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  save(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = "index.html";
  },
};

// ── Preferred language (drives translate calls + monument lang param) ─
YM.lang = {
  get() {
    return localStorage.getItem(LANG_KEY) || "en";
  },
  set(code) {
    localStorage.setItem(LANG_KEY, code);
  },
};

// ── "My trip" — a local, on-this-device-only list of monument slugs.
// The backend has a savedDestinations field on the User model, but no route
// reads or writes it yet, so a real cross-device "save" isn't possible without
// a backend change. This keeps the same idea working locally and is always
// labelled as device-only in the UI so it's never presented as synced. ──────
YM.trip = {
  get() {
    try {
      return JSON.parse(localStorage.getItem(TRIP_KEY) || "[]");
    } catch {
      return [];
    }
  },
  has(slug) {
    return this.get().includes(slug);
  },
  add(slug) {
    const list = this.get();
    if (!list.includes(slug)) {
      list.push(slug);
      localStorage.setItem(TRIP_KEY, JSON.stringify(list));
    }
  },
  remove(slug) {
    const list = this.get().filter((s) => s !== slug);
    localStorage.setItem(TRIP_KEY, JSON.stringify(list));
  },
  toggle(slug) {
    this.has(slug) ? this.remove(slug) : this.add(slug);
    return this.has(slug);
  },
  clear() {
    localStorage.removeItem(TRIP_KEY);
  },
};

// ── Shared header + mobile bottom nav ─────────────────────────────────
const NAV_ITEMS = [
  { href: "index.html", label: "AI Assistant", key: "assistant", icon: "sparkle" },
  { href: "explore.html", label: "Explore", key: "explore", icon: "compass" },
  { href: "festivals.html", label: "Festivals", key: "festivals", icon: "sparkle" },
  { href: "alerts.html", label: "Alerts", key: "alerts", icon: "shield" },
  { href: "laws.html", label: "Etiquette", key: "laws", icon: "book" },
  { href: "account.html", label: "Account", key: "account", icon: "user" },
];

const ICONS = {
  compass:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2.2 5.8-5.8 2.2 2.2-5.8z"/></svg>',
  sparkle:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>',
  shield:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4.5C4 3.7 4.7 3 5.5 3H12v18H5.5c-.8 0-1.5-.7-1.5-1.5z"/><path d="M20 4.5c0-.8-.7-1.5-1.5-1.5H12v18h6.5c.8 0 1.5-.7 1.5-1.5z"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c1.4-3.6 4.3-5.5 7.5-5.5s6.1 1.9 7.5 5.5"/></svg>',
};

YM.renderHeader = function renderHeader(activePage) {
  const host = document.getElementById("ym-header");
  if (host) {
    const user = YM.auth.getUser();
    const natLabel = YM.nationality.label();
    const currentLang = YM.lang.get();

    const LANG_OPTIONS = [
      { code: "en", name: "🌐 English" },
      { code: "hi", name: "🇮🇳 हिन्दी (Hindi)" },
      { code: "ta", name: "🇮🇳 தமிழ் (Tamil)" },
      { code: "te", name: "🇮🇳 తెలుగు (Telugu)" },
      { code: "bn", name: "🇮🇳 বাংলা (Bengali)" },
      { code: "mr", name: "🇮🇳 मराठी (Marathi)" },
      { code: "gu", name: "🇮🇳 ગુજરાતી (Gujarati)" },
      { code: "kn", name: "🇮🇳 ಕನ್ನಡ (Kannada)" },
      { code: "ml", name: "🇮🇳 മലയാളം (Malayalam)" },
      { code: "pa", name: "🇮🇳 ਪੰਜਾਬੀ (Punjabi)" },
      { code: "or", name: "🇮🇳 ଓଡ଼ିଆ (Odia)" },
      { code: "as", name: "🇮🇳 অসমীয়া (Assamese)" },
    ];

    host.innerHTML = `
      <div class="header-inner">
        <a href="index.html" class="brand">
          <span class="brand-mark" aria-hidden="true"></span>
          YatraMitra
        </a>
        <nav class="nav nav--desktop" aria-label="Primary">
          ${NAV_ITEMS.map(
            (item) =>
              `<a href="${item.href}" class="nav-link${activePage === item.key ? " nav-link--active" : ""}">${item.label}</a>`
          ).join("")}
        </nav>
        <div class="header-right" style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
          <div class="header-lang-wrapper">
            <select id="ym-global-lang-select" class="header-lang-select" aria-label="Select language" style="background: #ffffff; color: var(--ink); border: 1.5px solid var(--gold); border-radius: var(--radius-sm); padding: 0.35rem 0.65rem; font-size: 0.85rem; font-weight: 600; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.08); outline: none;">
              ${LANG_OPTIONS.map(
                (opt) => `<option value="${opt.code}" style="color:#222; font-weight:500;" ${opt.code === currentLang ? "selected" : ""}>${opt.name}</option>`
              ).join("")}
            </select>
          </div>
          ${
            natLabel
              ? `<button class="badge badge--nationality badge--clickable" id="ym-nationality-badge" type="button" title="Click to change">${natLabel} · Change</button>`
              : ""
          }
          ${
            user
              ? `<span class="header-user">Hi, ${YM.util.escapeHtml(user.name.split(" ")[0])}</span>
                 <button class="btn btn--ghost btn--sm" id="ym-logout-btn">Log out</button>`
              : `<a href="account.html" class="btn btn--ghost btn--sm">Log in</a>`
          }
        </div>
      </div>
    `;

    const langSelect = document.getElementById("ym-global-lang-select");
    if (langSelect) {
      langSelect.addEventListener("change", (e) => {
        const newLang = e.target.value;
        YM.lang.set(newLang);
        window.dispatchEvent(new CustomEvent("ym-lang-changed", { detail: { lang: newLang } }));
      });
    }

    const nationalityBadge = document.getElementById("ym-nationality-badge");
    if (nationalityBadge) {
      nationalityBadge.addEventListener("click", () => {
        YM.nationality.clear();
        window.location.href = "index.html";
      });
    }

    const logoutBtn = document.getElementById("ym-logout-btn");
    if (logoutBtn) logoutBtn.addEventListener("click", () => YM.auth.logout());
  }

  // Mobile bottom tab bar — primary navigation on the small screens this
  // project is built for first. Present on every page except the gate.
  const bottomHost = document.getElementById("ym-bottom-nav");
  if (bottomHost) {
    bottomHost.innerHTML = `
      <nav class="bottom-nav" aria-label="Primary">
        ${NAV_ITEMS.map(
          (item) => `
          <a href="${item.href}" class="bottom-nav-link${activePage === item.key ? " bottom-nav-link--active" : ""}">
            <span class="bottom-nav-icon" aria-hidden="true">${ICONS[item.icon]}</span>
            <span>${item.label}</span>
          </a>`
        ).join("")}
      </nav>
    `;
  }
};

// ── Live safety-alert banner (real SACHET data via /api/alerts) ───────
YM.renderAlertBanner = async function renderAlertBanner(hostId, { area } = {}) {
  const host = document.getElementById(hostId);
  if (!host) return;

  try {
    const res = await YM.api.getAlerts({ area });
    const alerts = res.data || [];
    if (alerts.length === 0) {
      host.innerHTML = "";
      return;
    }
    const top = alerts[0];
    host.innerHTML = `
      <div class="banner banner--alert" role="alert">
        <strong>Safety alert${alerts.length > 1 ? `s (${alerts.length})` : ""}:</strong>
        ${YM.util.escapeHtml(top.headline)}
        ${top.sourceUrl ? `<a href="${top.sourceUrl}" target="_blank" rel="noopener">Details</a>` : ""}
        ${alerts.length > 1 ? `<a href="alerts.html">See all</a>` : ""}
      </div>
    `;
  } catch (err) {
    console.error("Alert banner failed to load:", err);
    host.innerHTML = "";
  }
};

// ── Active-festival banner (real data via /api/festivals/active) ──────
YM.renderFestivalBanner = async function renderFestivalBanner(hostId, { state } = {}) {
  const host = document.getElementById(hostId);
  if (!host) return;

  try {
    const res = await YM.api.getActiveFestivals({ state });
    const festivals = res.data || [];
    if (festivals.length === 0) {
      host.innerHTML = "";
      return;
    }
    const top = festivals[0];
    host.innerHTML = `
      <div class="banner banner--festival">
        <strong>Happening now:</strong> ${YM.util.escapeHtml(top.name)}
        ${festivals.length > 1 ? ` &amp; ${festivals.length - 1} more` : ""}
      </div>
    `;
  } catch (err) {
    console.error("Festival banner failed to load:", err);
    host.innerHTML = "";
  }
};
