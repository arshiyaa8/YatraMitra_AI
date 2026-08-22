/**
 * monument.js — monument detail page.
 * Pulls from: GET /api/monuments/:slug, /api/translate/*, /api/crowd/:slug/*,
 * /api/weather/best-time, /api/alerts, /api/monuments/:slug/heritage-archive,
 * /api/monuments/offline-package. All fields rendered here exist on the real
 * Monument schema (tourism-backend/src/models/Monument.js) — nothing invented.
 */

let currentMonument = null;
let currentSlug = null;
let currentDisplayedText = ""; // whatever's on screen right now, for the Listen button

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
  setupListenButton();
  setupTripButton();
  setupOfflinePackButton();
  setupArchiveForm();
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
    renderArchive(currentMonument.heritageArchive || []);
    updateTripButton();
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

  const description = t("shortDescription", m.shortDescription);
  document.getElementById("m-description").textContent = description;
  currentDisplayedText = description;

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

  // Language tier note — be honest about machine-only translations
  const tierNote = document.getElementById("lang-tier-note");
  const reportBtn = document.getElementById("report-translation-btn");
  if (lang === "en") {
    tierNote.textContent = "";
    reportBtn.hidden = true;
  } else if (translation) {
    tierNote.textContent =
      translation.supportTier === "full" ? "✓ Reviewed translation" : "Best-effort machine translation";
    reportBtn.hidden = false;
  } else {
    tierNote.textContent = "No stored translation for this language yet — showing English.";
    reportBtn.hidden = true;
  }
}

function togglePanel(panelId, hasContent) {
  const panel = document.getElementById(panelId);
  if (panel) panel.hidden = !hasContent;
}

// ── Crowd (blends the Python ML crowd model with rules/reports — see
// tourism-backend/src/services/crowdService.js. `basis` tells us which path
// actually answered: "python_ml" means the AI model responded.) ────────────
async function loadCrowd(slug) {
  const levelEl = document.getElementById("crowd-level");
  const confEl = document.getElementById("crowd-confidence");
  const basisEl = document.getElementById("crowd-basis");
  try {
    const res = await YM.api.getCrowdEstimate(slug);
    const labels = { low: "Low", moderate: "Moderate", high: "High", very_high: "Very high" };
    levelEl.textContent = labels[res.level] || res.level || "Unavailable";
    confEl.textContent = `Confidence: ${res.confidence}${res.sampleSize ? ` · ${res.sampleSize} recent report(s)` : ""}`;

    const basisLabels = {
      python_ml: `AI prediction (${res.model || "crowd model"})`,
      rules_based_fallback: "Rule-of-thumb estimate — AI model unavailable",
      blended_rules_and_reports_fallback: "Blended from traveller reports — AI model unavailable",
    };
    basisEl.textContent = basisLabels[res.basis] || "";
  } catch (err) {
    console.error("Crowd estimate failed:", err);
    levelEl.textContent = "Unavailable";
    confEl.textContent = "";
    basisEl.textContent = "";
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

// ── Listen (text-to-speech via Bhashini) ───────────────────────────────────
function setupListenButton() {
  const btn = document.getElementById("listen-btn");
  btn.addEventListener("click", async () => {
    const statusEl = document.getElementById("listen-status");
    const audioEl = document.getElementById("listen-audio");
    btn.disabled = true;
    statusEl.textContent = "Preparing narration…";
    audioEl.hidden = true;

    try {
      const res = await YM.api.textToSpeech({ text: currentDisplayedText, language: YM.lang.get() });
      if (!res.audioBase64) throw new Error("No audio returned");
      audioEl.src = `data:audio/wav;base64,${res.audioBase64}`;
      audioEl.hidden = false;
      statusEl.textContent = "";
      audioEl.play().catch(() => {});
    } catch (err) {
      console.error("Text-to-speech failed:", err);
      statusEl.textContent = "Voice narration isn't available right now.";
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById("report-translation-btn").addEventListener("click", async () => {
    const status = document.getElementById("report-translation-status");
    if (!YM.auth.isLoggedIn()) {
      status.textContent = "Log in first, then you can flag a translation issue.";
      return;
    }
    status.textContent = "Sending feedback…";
    try {
      await YM.api.reportBadTranslation({
        text: currentDisplayedText,
        language: YM.lang.get(),
        context: `monument:${currentSlug}`,
      });
      status.textContent = "Thanks — flagged for review.";
    } catch (err) {
      status.textContent = `Couldn't send feedback: ${err.message}`;
    }
  });
}

// ── "My trip" — local, on-this-device list (see app.js for why) ────────────
function setupTripButton() {
  document.getElementById("trip-btn").addEventListener("click", () => {
    YM.trip.toggle(currentSlug);
    updateTripButton();
  });
}

function updateTripButton() {
  const btn = document.getElementById("trip-btn");
  const inTrip = YM.trip.has(currentSlug);
  btn.textContent = inTrip ? "✓ In my trip" : "+ Add to my trip";
}

// ── Offline pack (POST /api/monuments/offline-package) ─────────────────────
function setupOfflinePackButton() {
  document.getElementById("offline-pack-btn").addEventListener("click", async () => {
    const status = document.getElementById("offline-pack-status");
    const slugs = Array.from(new Set([...YM.trip.get(), currentSlug]));
    status.textContent = "Preparing offline pack…";
    try {
      const res = await YM.api.getOfflinePackage(slugs);
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "yatramitra-offline-pack.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      status.textContent = `Saved ${res.count} site${res.count === 1 ? "" : "s"} for offline viewing.`;
    } catch (err) {
      status.textContent = `Couldn't build offline pack: ${err.message}`;
    }
  });
}

// ── Heritage archive (community oral history) ──────────────────────────────
function renderArchive(entries) {
  const host = document.getElementById("archive-list");
  if (!entries.length) {
    host.innerHTML = `<p class="empty-state" style="padding:1rem 0;">No stories yet — be the first to add one.</p>`;
  } else {
    host.innerHTML = entries
      .map(
        (e) => `
        <div class="archive-entry">
          <h4>${YM.util.escapeHtml(e.title || "Untitled story")}</h4>
          <p class="archive-meta">${YM.util.escapeHtml(e.narratorName || "Anonymous")} · ${YM.util.escapeHtml(e.language || "")}</p>
          ${e.transcript ? `<p>${YM.util.escapeHtml(e.transcript)}</p>` : ""}
          ${e.audioUrl ? `<audio controls src="${YM.util.escapeHtml(e.audioUrl)}" style="width:100%;"></audio>` : ""}
        </div>`
      )
      .join("");
  }

  document.getElementById("archive-form-block").hidden = !YM.auth.isLoggedIn();
  document.getElementById("archive-login-hint").hidden = YM.auth.isLoggedIn();
}

function setupArchiveForm() {
  document.getElementById("archive-submit-btn").addEventListener("click", async () => {
    const status = document.getElementById("archive-status");
    const title = document.getElementById("archive-title").value.trim();
    const language = document.getElementById("archive-language").value.trim();
    if (!title || !language) {
      status.textContent = "Title and language are required.";
      return;
    }
    status.textContent = "Submitting…";
    try {
      await YM.api.addHeritageArchiveEntry(currentSlug, {
        title,
        narratorName: document.getElementById("archive-narrator").value.trim(),
        language,
        transcript: document.getElementById("archive-transcript").value.trim(),
        audioUrl: document.getElementById("archive-audio").value.trim(),
      });
      status.textContent = "Thanks — your story was added.";
      document.getElementById("archive-title").value = "";
      document.getElementById("archive-narrator").value = "";
      document.getElementById("archive-transcript").value = "";
      document.getElementById("archive-audio").value = "";
      const res = await YM.api.getMonument(currentSlug, YM.lang.get());
      renderArchive(res.data.heritageArchive || []);
    } catch (err) {
      status.textContent = `Couldn't submit: ${err.message}`;
    }
  });
}

function showError(message) {
  document.getElementById("monument-loading").hidden = true;
  document.getElementById("monument-content").hidden = true;
  const errorEl = document.getElementById("monument-error");
  errorEl.textContent = message;
  errorEl.hidden = false;
}
