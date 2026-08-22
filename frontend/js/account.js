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
async function loadHealthProfile() {
  try {
    const res = await YM.api.getHealthProfile();
    if (res.optedIn && res.data) {
      document.getElementById("health-allergies").value = (res.data.allergies || []).join(", ");
      document.getElementById("health-conditions").value = (res.data.conditions || []).join(", ");
      document.getElementById("health-mobility").value = (res.data.mobilityNeeds || []).join(", ");
      document.getElementById("health-notes").value = res.data.notes || "";
    }
  } catch (err) {
    console.error("Couldn't load health profile:", err);
  }
}

function splitCsv(value) {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

async function saveHealthProfile() {
  const status = document.getElementById("health-status");
  status.textContent = "Saving…";
  try {
    await YM.api.setHealthProfile({
      allergies: splitCsv(document.getElementById("health-allergies").value),
      conditions: splitCsv(document.getElementById("health-conditions").value),
      mobilityNeeds: splitCsv(document.getElementById("health-mobility").value),
      notes: document.getElementById("health-notes").value.trim(),
    });
    status.textContent = "Saved — encrypted and opted in.";
    loadRecommendationFlags();
  } catch (err) {
    status.textContent = `Couldn't save: ${err.message}`;
  }
}

async function clearHealthProfile() {
  const status = document.getElementById("health-status");
  status.textContent = "Clearing…";
  try {
    await YM.api.clearHealthProfile();
    document.getElementById("health-allergies").value = "";
    document.getElementById("health-conditions").value = "";
    document.getElementById("health-mobility").value = "";
    document.getElementById("health-notes").value = "";
    status.textContent = "Health profile cleared.";
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
    host.innerHTML = `
      <p class="widget-sub">This is shaping your recommendations:</p>
      <ul class="chip-list">${flags.map((f) => `<li class="chip">${YM.util.escapeHtml(f.replaceAll("_", " "))}</li>`).join("")}</ul>
    `;
  } catch {
    host.innerHTML = "";
  }
}

// ── My trip (local list — see app.js) ───────────────────────────────────
function renderTripList() {
  const host = document.getElementById("trip-list");
  const slugs = YM.trip.get();
  if (!slugs.length) {
    host.innerHTML = `<li class="widget-sub">No sites added yet — add some from a monument page.</li>`;
    return;
  }
  host.innerHTML = slugs
    .map(
      (slug) =>
        `<li><a class="chip" href="monument.html?slug=${encodeURIComponent(slug)}">${YM.util.escapeHtml(slug.replaceAll("-", " "))}</a></li>`
    )
    .join("");
}
