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

  const urlSlug = YM.util.qs("slug") || YM.util.qs("id");
  const storedSlug = sessionStorage.getItem("ym_selected_monument");
  currentSlug = urlSlug || storedSlug || "taj-mahal";
  sessionStorage.setItem("ym_selected_monument", currentSlug);

  await setupMonumentSwitcher();
  await setupLanguageSwitcher();
  await loadMonument(YM.lang.get());
  setupListenButton();
  setupAssistantForm();
  setupTripButton();
  setupOfflinePackButton();
  setupArchiveForm();
});

async function setupMonumentSwitcher() {
  const select = document.getElementById("monument-select");
  if (!select) return;

  try {
    const res = await YM.api.listMonuments({ limit: 50 });
    const items = res.data || [];
    select.innerHTML = items
      .map((m) => `<option value="${m.slug}">${YM.util.escapeHtml(m.name)} (${YM.util.escapeHtml(m.state)})</option>`)
      .join("");
    select.value = currentSlug;
  } catch (err) {
    console.error("Could not populate monument list:", err);
  }

  select.addEventListener("change", async (e) => {
    currentSlug = e.target.value;
    window.history.pushState(null, "", `monument.html?slug=${encodeURIComponent(currentSlug)}`);
    await loadMonument(YM.lang.get());
    const chatStream = document.getElementById("assistant-chat-stream");
    if (chatStream) chatStream.innerHTML = "";
  });

  window.addEventListener("popstate", async () => {
    const slug = YM.util.qs("slug") || YM.util.qs("id") || "taj-mahal";
    if (slug !== currentSlug) {
      currentSlug = slug;
      select.value = currentSlug;
      await loadMonument(YM.lang.get());
    }
  });
}

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
    const chosen = e.target.value;
    YM.lang.set(chosen);
    const globalSelect = document.getElementById("ym-global-lang-select");
    if (globalSelect) globalSelect.value = chosen;
    await loadMonument(chosen);
  });

  window.addEventListener("ym-lang-changed", async (e) => {
    const newLang = e.detail?.lang || YM.lang.get();
    if (select && select.value !== newLang) {
      select.value = newLang;
    }
    await loadMonument(newLang);
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

    const monumentSelect = document.getElementById("monument-select");
    if (monumentSelect && monumentSelect.value !== currentSlug) {
      monumentSelect.value = currentSlug;
    }

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

  const history = t("history", m.history);
  currentDisplayedText = `${t("name", m.name)}. ${description}${history ? " " + history : ""}`;

  // Hero Backdrop Photo
  const heroBg = document.getElementById("m-hero-backdrop");
  const images = m.images && m.images.length ? m.images : [];
  if (heroBg) {
    if (images.length > 0) {
      heroBg.style.backgroundImage = `url("${images[0]}")`;
      heroBg.hidden = false;
    } else {
      heroBg.style.backgroundImage = "none";
    }
  }

  // Photo Showcase Gallery
  const galleryPanel = document.getElementById("m-gallery-panel");
  const galleryContainer = document.getElementById("m-photo-gallery");
  if (galleryPanel && galleryContainer) {
    if (images.length > 0) {
      galleryPanel.hidden = false;
      galleryContainer.innerHTML = images
        .map(
          (imgUrl, idx) => `
            <div style="position:relative; border-radius:var(--radius-md); overflow:hidden; box-shadow:var(--shadow-card); aspect-ratio:16/10; background:var(--ivory-dim);">
              <img src="${YM.util.escapeHtml(imgUrl)}" alt="${YM.util.escapeHtml(m.name)} - Photo ${idx + 1}" loading="lazy" style="width:100%; height:100%; object-fit:cover; display:block; transition:transform 0.3s ease;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'" />
            </div>
          `
        )
        .join("");
    } else {
      galleryPanel.hidden = true;
    }
  }

  togglePanel("m-history-panel", m.history);
  document.getElementById("m-history").textContent = history || "";

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

// ── Listen (text-to-speech via Bhashini & Web Speech API) ──────────────────
let isAudioPlaying = false;
let isAudioPaused = false;

function setupListenButton() {
  const listenBtn = document.getElementById("listen-btn");
  const pauseBtn = document.getElementById("pause-btn");
  const stopBtn = document.getElementById("stop-btn");
  const statusEl = document.getElementById("listen-status");
  const audioEl = document.getElementById("listen-audio");

  const resetAudioUI = () => {
    isAudioPlaying = false;
    isAudioPaused = false;
    listenBtn.hidden = false;
    listenBtn.disabled = false;
    listenBtn.textContent = "🔊 Listen";
    if (pauseBtn) {
      pauseBtn.hidden = true;
      pauseBtn.textContent = "⏸️ Pause";
    }
    if (stopBtn) stopBtn.hidden = true;
    statusEl.textContent = "";
  };

  const stopAllAudio = () => {
    if (audioEl) {
      audioEl.pause();
      audioEl.currentTime = 0;
      audioEl.hidden = true;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    resetAudioUI();
  };

  listenBtn.addEventListener("click", async () => {
    stopAllAudio();
    listenBtn.disabled = true;
    statusEl.textContent = "Preparing voice guide…";

    const lang = YM.lang.get();
    const textToRead = currentDisplayedText || document.getElementById("m-name").textContent;

    try {
      // 1. Try server-side Bhashini TTS
      const res = await YM.api.textToSpeech({ text: textToRead, language: lang });

      if (res && res.audioBase64) {
        audioEl.src = `data:audio/wav;base64,${res.audioBase64}`;
        audioEl.hidden = false;
        audioEl.play().catch(() => {});
        isAudioPlaying = true;
        isAudioPaused = false;

        listenBtn.hidden = true;
        if (pauseBtn) pauseBtn.hidden = false;
        if (stopBtn) stopBtn.hidden = false;
        statusEl.textContent = "🔊 Playing official audio narration…";

        audioEl.onended = () => resetAudioUI();
        audioEl.onpause = () => {
          if (isAudioPlaying && pauseBtn) {
            pauseBtn.textContent = "▶️ Resume";
            statusEl.textContent = "Narration paused.";
          }
        };
        audioEl.onplay = () => {
          if (pauseBtn) pauseBtn.textContent = "⏸️ Pause";
          statusEl.textContent = "🔊 Playing official audio narration…";
        };
        return;
      }
    } catch (err) {
      console.warn("Server TTS unavailable, using browser speech synthesis:", err);
    }

    // 2. Client-side Web Speech API Fallback
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(textToRead);

      const langMap = {
        hi: "hi-IN",
        ta: "ta-IN",
        te: "te-IN",
        bn: "bn-IN",
        mr: "mr-IN",
        gu: "gu-IN",
        kn: "kn-IN",
        ml: "ml-IN",
        pa: "pa-IN",
        ur: "ur-IN",
        en: "en-IN",
      };
      utterance.lang = langMap[lang] || "en-IN";
      utterance.rate = 0.95;

      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find(
        (v) => v.lang === utterance.lang || v.lang.startsWith(lang)
      );
      if (matchedVoice) utterance.voice = matchedVoice;

      utterance.onstart = () => {
        isAudioPlaying = true;
        isAudioPaused = false;
        listenBtn.hidden = true;
        if (pauseBtn) pauseBtn.hidden = false;
        if (stopBtn) stopBtn.hidden = false;
        statusEl.textContent = `🔊 Narrating in ${lang.toUpperCase()}…`;
      };

      utterance.onend = () => resetAudioUI();
      utterance.onerror = (e) => {
        console.error("Speech synthesis error:", e);
        resetAudioUI();
        statusEl.textContent = "Narration finished.";
      };

      window.speechSynthesis.speak(utterance);
    } else {
      resetAudioUI();
      statusEl.textContent = "Audio narration is not supported on this browser.";
    }
  });

  if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
      if (!isAudioPlaying) return;

      if (!isAudioPaused) {
        if (audioEl && !audioEl.hidden && !audioEl.paused) {
          audioEl.pause();
        } else if (window.speechSynthesis && window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
        }
        isAudioPaused = true;
        pauseBtn.textContent = "▶️ Resume";
        statusEl.textContent = "Narration paused.";
      } else {
        if (audioEl && !audioEl.hidden && audioEl.paused) {
          audioEl.play().catch(() => {});
        } else if (window.speechSynthesis && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        isAudioPaused = false;
        pauseBtn.textContent = "⏸️ Pause";
        statusEl.textContent = "🔊 Resuming narration…";
      }
    });
  }

  if (stopBtn) {
    stopBtn.addEventListener("click", () => {
      stopAllAudio();
    });
  }

  window.addEventListener("beforeunload", () => stopAllAudio());

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

// ── AI Heritage Q&A Assistant ─────────────────────────────────────────────
function setupAssistantForm() {
  const form = document.getElementById("assistant-form");
  const input = document.getElementById("assistant-input");
  const chatStream = document.getElementById("assistant-chat-stream");
  const promptsContainer = document.getElementById("assistant-quick-prompts");

  if (!form || !input || !chatStream) return;

  // Handle Quick Prompts
  if (promptsContainer) {
    promptsContainer.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-prompt]");
      if (!btn) return;
      input.value = btn.getAttribute("data-prompt");
      form.dispatchEvent(new Event("submit"));
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const question = input.value.trim();
    if (!question) return;

    input.value = "";

    // 1. Append User Question Bubble
    const userBubble = document.createElement("div");
    userBubble.style.cssText =
      "align-self: flex-end; background: var(--maroon); color: #fff; padding: 0.6rem 0.95rem; border-radius: 14px 14px 2px 14px; max-width: 82%; font-size: 0.92rem; word-break: break-word;";
    userBubble.textContent = question;
    chatStream.appendChild(userBubble);

    // 2. Append Typing Indicator
    const typingBubble = document.createElement("div");
    typingBubble.id = "assistant-typing";
    typingBubble.style.cssText =
      "align-self: flex-start; background: var(--ivory-dim); border: 1px solid var(--line); padding: 0.6rem 0.9rem; border-radius: 14px 14px 14px 2px; max-width: 85%; font-size: 0.88rem; color: var(--ink-soft); font-style: italic;";
    typingBubble.textContent = "Checking verified heritage records…";
    chatStream.appendChild(typingBubble);
    chatStream.scrollTop = chatStream.scrollHeight;

    try {
      const res = await YM.api.askMonumentQuestion(currentSlug, question);
      typingBubble.remove();

      // 3. Append AI Answer Bubble
      const answerBubble = document.createElement("div");
      answerBubble.className = "assistant-answer-bubble";
      answerBubble.style.cssText =
        "align-self: flex-start; background: #fff; border: 1px solid var(--gold-light); border-left: 3px solid var(--gold); padding: 0.8rem 1rem; border-radius: 14px 14px 14px 2px; max-width: 90%; font-size: 0.92rem; box-shadow: 0 2px 8px rgba(0,0,0,0.04);";

      const answerText = res.answer || "No specific details found for that question.";
      answerBubble.innerHTML = `
        <p style="margin: 0 0 0.5rem; line-height: 1.5; color: var(--ink); white-space: pre-line;">${YM.util.escapeHtml(answerText)}</p>
        <button type="button" class="btn btn--ghost btn--sm speak-answer-btn" style="padding: 0.2rem 0.6rem; font-size: 0.78rem;">🔊 Read aloud</button>
      `;

      // Attach speak action
      const speakBtn = answerBubble.querySelector(".speak-answer-btn");
      speakBtn.addEventListener("click", () => {
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(answerText);
          const lang = YM.lang.get();
          utterance.lang = lang === "hi" ? "hi-IN" : "en-IN";
          utterance.rate = 0.95;
          window.speechSynthesis.speak(utterance);
        }
      });

      chatStream.appendChild(answerBubble);
      chatStream.scrollTop = chatStream.scrollHeight;
    } catch (err) {
      typingBubble.remove();
      const errBubble = document.createElement("div");
      errBubble.style.cssText =
        "align-self: flex-start; background: #fff5f5; border: 1px solid #fed7d7; color: var(--danger); padding: 0.6rem 0.9rem; border-radius: 12px; font-size: 0.88rem;";
      errBubble.textContent = `Couldn't get answer: ${err.message}`;
      chatStream.appendChild(errBubble);
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

function showError(message, showExploreLink = true) {
  document.getElementById("monument-loading").hidden = true;
  document.getElementById("monument-content").hidden = true;
  const errorEl = document.getElementById("monument-error");
  if (showExploreLink) {
    errorEl.innerHTML = `
      <div style="padding: 2rem 1rem; text-align: center;">
        <p style="font-size:1.1rem; color:var(--ink); margin-bottom:1.25rem;">${YM.util.escapeHtml(message)}</p>
        <a href="explore.html" class="btn btn--primary">Browse Heritage Sites &rarr;</a>
      </div>
    `;
  } else {
    errorEl.innerHTML = `
      <div style="padding: 2rem 1rem; text-align: center;">
        <p style="font-size:1.1rem; color:var(--ink); margin-bottom:1.25rem;">${YM.util.escapeHtml(message)}</p>
        <a href="explore.html" class="btn btn--ghost">&larr; Back to Explore</a>
      </div>
    `;
  }
  errorEl.hidden = false;
}
