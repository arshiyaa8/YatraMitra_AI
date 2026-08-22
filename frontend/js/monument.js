/**
 * monument.js — monument detail page.
 * Pulls from: GET /api/monuments/:slug, /api/translate/*, /api/crowd/:slug/*,
 * /api/weather/best-time, /api/alerts. All fields rendered here exist on the
 * real Monument schema (tourism-backend/src/models/Monument.js) — nothing invented.
 */

let currentMonument = null;
let currentSlug = null;

document.addEventListener("DOMContentLoaded", async () => {
  if (!YM.nationality.require()) return;
  YM.renderHeader("explore");

  currentSlug = YM.util.qs("slug");
  if (!currentSlug) {
    showError("No monument specified.");
    return;
  }

  await setupLanguageSwitcher();
  await loadMonument(YM.lang.get());
});

async function setupLanguageSwitcher() {
  const select = document.getElementById("lang-select");
  try {
    const res = await YM.api.listLanguages();
    const langs = res.data || {};
    select.innerHTML = Object.entries(langs)
      .map(([code, info]) => `<option value="${code}">${YM.util.escapeHtml(info.name)}</option>`)
      .join("");
    select.value = YM.lang.get();
  } catch (err) {
    console.error("Could not load language list:", err);
    select.innerHTML = `<option value="en">English</option>`;
  }

  select.addEventListener("change", async (e) => {
    YM.lang.set(e.target.value);
    await loadMonument(e.target.value);
  });
}

async function loadMonument(lang) {
  document.getElementById("monument-loading").hidden = false;
  document.getElementById("monument-content").hidden = true;
  document.getElementById("monument-error").hidden = true;

  try {
    const res = await YM.api.getMonument(currentSlug, lang);
    currentMonument = res.data;
    await renderMonument(currentMonument, res.translation, lang);

    document.getElementById("monument-loading").hidden = true;
    document.getElementById("monument-content").hidden = false;

    // Site-specific safety alerts, filtered to this monument's state.
    YM.renderAlertBanner("alert-banner-host", { area: currentMonument.state });

    loadCrowd(currentSlug);
    loadWeather(currentMonument);
  } catch (err) {
    console.error(err);
    showError("Couldn't load this monument. It may not exist, or the backend isn't reachable.");
  }
}

async function renderMonument(m, translation, lang) {
  const t = (field, fallback) => (translation && translation[field]) || fallback;

  document.getElementById("m-location").textContent = `${m.state}${m.district ? " · " + m.district : ""} · ${m.category}`;
  document.getElementById("m-name").textContent = t("name", m.name);
  document.getElementById("m-tagline").textContent = m.shortDescription;

  document.getElementById("m-description").textContent = t("shortDescription", m.shortDescription);
  togglePanel("m-history-panel", m.history);
  document.getElementById("m-history").textContent = t("history", m.history);

  togglePanel("m-culture-panel", m.culturalSignificance);
  document.getElementById("m-culture").textContent = m.culturalSignificance || "";

  const etiquette = t("dosAndDonts", m.lawsAndEtiquette) || [];
  togglePanel("m-etiquette-panel", etiquette.length > 0);
  document.getElementById("m-etiquette-list").innerHTML = etiquette
    .map((line) => `<li>${YM.util.escapeHtml(line)}</li>`)
    .join("");

  togglePanel("m-food-panel", (m.foodNearby || []).length > 0);
  document.getElementById("m-food-list").innerHTML = (m.foodNearby || [])
    .map((f) => `<li class="chip">${YM.util.escapeHtml(f)}</li>`)
    .join("");

  const accTags = (m.accessibility && m.accessibility.tags) || [];
  togglePanel("m-accessibility-panel", accTags.length > 0);
  document.getElementById("m-accessibility-list").innerHTML = accTags
    .map((tag) => `<li class="chip">${YM.util.escapeHtml(tag.replaceAll("_", " "))}</li>`)
    .join("");

  // Visit details
  const timings = m.timings || {};
  document.getElementById("m-hours").textContent =
    timings.openTime && timings.closeTime ? `${timings.openTime} – ${timings.closeTime}` : "Not listed";
  document.getElementById("m-closed").textContent = (timings.closedOn || []).join(", ") || "Open all week";
  document.getElementById("m-best-time-of-day").textContent = timings.bestVisitTimeOfDay || "Not listed";

  const nationality = YM.nationality.get();
  const fee = m.entryFee && (nationality === "indian" ? m.entryFee.indian : m.entryFee.foreigner);
  document.getElementById("m-fee").textContent =
    fee === 0 ? "Free" : fee ? `${m.entryFee.currency || "INR"} ${fee}` : "Not listed";

  // Language tier note — be honest about machine-only translations (report §4.6 idea)
  const tierNote = document.getElementById("lang-tier-note");
  if (lang === "en") {
    tierNote.textContent = "";
  } else if (translation) {
    tierNote.textContent =
      translation.supportTier === "full" ? "✓ Reviewed translation" : "Best-effort machine translation";
  } else {
    tierNote.textContent = "No stored translation for this language yet — showing English.";
  }
}

function togglePanel(panelId, hasContent) {
  const panel = document.getElementById(panelId);
  if (panel) panel.hidden = !hasContent;
}

async function loadCrowd(slug) {
  const levelEl = document.getElementById("crowd-level");
  const confEl = document.getElementById("crowd-confidence");
  try {
    const res = await YM.api.getCrowdEstimate(slug);
    const labels = { low: "Low", moderate: "Moderate", high: "High", very_high: "Very high" };
    levelEl.textContent = labels[res.level] || res.level;
    confEl.textContent = `Confidence: ${res.confidence}${res.sampleSize ? ` · ${res.sampleSize} recent report(s)` : ""}`;
  } catch (err) {
    console.error("Crowd estimate failed:", err);
    levelEl.textContent = "Unavailable";
    confEl.textContent = "";
  }

  const reportBlock = document.getElementById("crowd-report-block");
  const loginHint = document.getElementById("crowd-login-hint");
  if (YM.auth.isLoggedIn()) {
    reportBlock.hidden = false;
    loginHint.hidden = true;
    const reportBtn = document.getElementById("crowd-report-btn");
    // loadCrowd() re-runs on every language switch — guard so we don't stack listeners.
    if (!reportBtn.dataset.bound) {
      reportBtn.dataset.bound = "true";
      reportBtn.addEventListener("click", async () => {
        const level = document.getElementById("crowd-report-select").value;
        const status = document.getElementById("crowd-report-status");
        status.textContent = "Submitting…";
        try {
          await YM.api.submitCrowdReport(currentSlug, level);
          status.textContent = "Thanks — your report has been recorded.";
          loadCrowd(currentSlug);
        } catch (err) {
          status.textContent = `Couldn't submit: ${err.message}`;
        }
      });
    }
  } else {
    reportBlock.hidden = true;
    loginHint.hidden = false;
  }
}

async function loadWeather(m) {
  const adviceEl = document.getElementById("weather-advice");
  const statsEl = document.getElementById("weather-stats");
  const [lng, lat] = m.location?.coordinates || [];
  if (lat === undefined || lng === undefined) {
    adviceEl.textContent = "Location data unavailable for this site.";
    return;
  }

  try {
    const res = await YM.api.getBestTimeAdvice({
      lat,
      lng,
      bestVisitMonths: m.timings?.bestVisitMonths || [],
    });
    adviceEl.textContent = res.advice;
    statsEl.textContent = `${res.currentMonth}: ~${res.recentAvgTemperatureC}°C, ${res.recentAvgPrecipitationMm}mm recent rainfall`;
  } catch (err) {
    console.error("Weather advice failed:", err);
    adviceEl.textContent = "Weather data unavailable right now.";
    statsEl.textContent = "";
  }
}

function showError(message) {
  document.getElementById("monument-loading").hidden = true;
  document.getElementById("monument-content").hidden = true;
  const errorEl = document.getElementById("monument-error");
  errorEl.textContent = message;
  errorEl.hidden = false;
}
