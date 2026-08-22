/**
 * app.js — shared across every page: nationality gate, auth state, header,
 * and the alert/festival banners (real data from the backend).
 */

// NOTE: YM is already declared (const) by config.js, which loads before this
// file on every page — do not redeclare it here, just use it directly below.

// ── Storage keys ────────────────────────────────────────────────────
const NATIONALITY_KEY = "ym_nationality"; // "indian" | "foreigner"
const TOKEN_KEY = "ym_token";
const USER_KEY = "ym_user";
const LANG_KEY = "ym_lang";

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

// ── Shared header, injected into every page's <header id="ym-header"> ─
YM.renderHeader = function renderHeader(activePage) {
  const host = document.getElementById("ym-header");
  if (!host) return;

  const user = YM.auth.getUser();
  const natLabel = YM.nationality.label();

  const navItem = (href, label, key) =>
    `<a href="${href}" class="nav-link${activePage === key ? " nav-link--active" : ""}">${label}</a>`;

  host.innerHTML = `
    <div class="header-inner">
      <a href="explore.html" class="brand">
        <span class="brand-mark" aria-hidden="true"></span>
        YatraMitra
      </a>
      <nav class="nav" aria-label="Primary">
        ${navItem("explore.html", "Explore", "explore")}
        ${navItem("laws.html", "Laws &amp; Etiquette", "laws")}
      </nav>
      <div class="header-right">
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

  const nationalityBadge = document.getElementById("ym-nationality-badge");
  if (nationalityBadge) {
    nationalityBadge.addEventListener("click", () => {
      YM.nationality.clear();
      window.location.href = "index.html";
    });
  }

  const logoutBtn = document.getElementById("ym-logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", () => YM.auth.logout());
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