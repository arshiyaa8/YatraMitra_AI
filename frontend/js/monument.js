/**
 * monument.js — Detailed Heritage Monument View Controller
 *
 * Coordinates deep-dive heritage records, multi-angle photo showcase,
 * localized text & audio guide narration (Bhashini TTS), ML crowd predictions,
 * climatic visit recommendations, community oral archives, and offline package caching.
 */

let currentMonument = null;
let currentSlug = null;
let currentDisplayedText = ""; // Holds rendered description for real-time Text-to-Speech playback

document.addEventListener("DOMContentLoaded", async () => {
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
    
    const globalEntries = Object.entries(langs).filter(([_, info]) => info.region === "global" || info.region === "foreign");
    const indianEntries = Object.entries(langs).filter(([_, info]) => info.region === "indian");

    select.innerHTML = `
      <optgroup label="Global Languages">
        ${globalEntries.map(([code, info]) => `<option value="${code}">${YM.util.escapeHtml(info.name)}</option>`).join("")}
      </optgroup>
      <optgroup label="Indian Languages">
        ${indianEntries.map(([code, info]) => `<option value="${code}">${YM.util.escapeHtml(info.name)}</option>`).join("")}
      </optgroup>
    `;
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
  const defaultCategoryHero = {
    monument: "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1200&q=80",
    fort: "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1200&q=80",
    temple: "https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?auto=format&fit=crop&w=1200&q=80",
    museum: "https://images.unsplash.com/photo-1558431382-27e303142255?auto=format&fit=crop&w=1200&q=80",
    natural: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    wildlife: "https://images.unsplash.com/photo-1575550959106-5a7defe28b56?auto=format&fit=crop&w=1200&q=80",
  };
  const images = m.images && m.images.length ? m.images : [];
  const heroImage = images.length > 0 ? images[0] : (defaultCategoryHero[m.category] || defaultCategoryHero.monument);
  if (heroBg) {
    heroBg.style.backgroundImage = `url("${heroImage}")`;
    heroBg.hidden = false;
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
              <img src="${YM.util.escapeHtml(imgUrl)}" alt="${YM.util.escapeHtml(m.name)} - Photo ${idx + 1}" loading="lazy" style="width:100%; height:100%; object-fit:cover; display:block; transition:transform 0.3s ease;" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80';" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'" />
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

  let feeText = "Not listed";
  if (m.entryFee) {
    if (m.entryFee.indian === 0 && (!m.entryFee.foreigner || m.entryFee.foreigner === 0)) {
      feeText = "Free entry";
    } else {
      feeText = `${m.entryFee.currency || "INR"} ${m.entryFee.indian || 0}`;
      if (m.entryFee.foreigner && m.entryFee.foreigner !== m.entryFee.indian) {
        feeText += ` (Foreigner: ${m.entryFee.currency || "INR"} ${m.entryFee.foreigner})`;
      }
    }
  }
  document.getElementById("m-fee").textContent = feeText;

  // Localize labels if in Hindi
  const isHi = lang === "hi";
  const hoursLabel = document.querySelector("#m-hours")?.previousElementSibling;
  if (hoursLabel && isHi) hoursLabel.textContent = "समय";
  const closedLabel = document.querySelector("#m-closed-on")?.previousElementSibling;
  if (closedLabel && isHi) closedLabel.textContent = "बंद दिन";
  const bestTimeLabel = document.querySelector("#m-best-time-of-day")?.previousElementSibling;
  if (bestTimeLabel && isHi) bestTimeLabel.textContent = "उत्तम समय";
  const feeLabel = document.querySelector("#m-fee")?.previousElementSibling;
  if (feeLabel && isHi) feeLabel.textContent = "प्रवेश शुल्क";

  // Language tier note — be honest about machine-only translations
  const tierNote = document.getElementById("lang-tier-note");
  const reportBtn = document.getElementById("report-translation-btn");
  if (lang === "en") {
    tierNote.textContent = "";
    reportBtn.hidden = true;
  } else if (translation) {
    tierNote.textContent =
      translation.supportTier === "full" ? "✓ पूर्ण सत्यापित हिन्दी अनुवाद (Verified Translation)" : "Best-effort machine translation";
    reportBtn.hidden = false;
  } else {
    tierNote.textContent = "No stored translation for this language yet — showing English.";
    reportBtn.hidden = true;
  }

  // Render Mini Location Map
  renderMonumentMap(m);
}

function renderMonumentMap(m, retryCount = 0) {
  const mapEl = document.getElementById("monument-mini-map");
  const directionsBtn = document.getElementById("m-directions-btn");
  const panel = document.getElementById("m-location-panel");
  if (!mapEl) return;

  if (typeof L === "undefined") {
    if (retryCount < 10) {
      setTimeout(() => renderMonumentMap(m, retryCount + 1), 200);
    }
    return;
  }

  const coords = m.location?.coordinates;
  if (!coords || coords.length < 2) {
    if (panel) panel.hidden = true;
    return;
  }

  if (panel) panel.hidden = false;
  const [lng, lat] = coords;
  if (directionsBtn) {
    directionsBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }

  if (window._monumentMiniMap) {
    try {
      window._monumentMiniMap.remove();
    } catch (e) {}
    window._monumentMiniMap = null;
  }

  setTimeout(() => {
    try {
      const map = L.map("monument-mini-map", {
        center: [lat, lng],
        zoom: 14,
        zoomControl: true,
        attributionControl: false,
      });
      window._monumentMiniMap = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        subdomains: ["a", "b", "c"],
      }).addTo(map);

      const marker = L.marker([lat, lng]).addTo(map);
      marker.bindPopup(`<strong>${YM.util.escapeHtml(m.name)}</strong><br/>${YM.util.escapeHtml(m.state || "")}`).openPopup();

      // Multi-tick layout settling to ensure tiles never render blank or grey
      setTimeout(() => map.invalidateSize(), 50);
      setTimeout(() => map.invalidateSize(), 250);
      setTimeout(() => map.invalidateSize(), 600);

      window.addEventListener("resize", () => {
        if (window._monumentMiniMap) window._monumentMiniMap.invalidateSize();
      });
      window.addEventListener("orientationchange", () => {
        if (window._monumentMiniMap) setTimeout(() => window._monumentMiniMap.invalidateSize(), 200);
      });
    } catch (err) {
      console.warn("Could not init monument map:", err);
    }
  }, 50);
}

function togglePanel(panelId, hasContent) {
  const panel = document.getElementById(panelId);
  if (panel) panel.hidden = !hasContent;
}

// ── Real-Time Live Crowd Radar & Multi-Signal Intelligence ──────────────
let _selectedVisionImageBase64 = null;

async function loadCrowd(slug) {
  const badgeEl = document.getElementById("crowd-level-badge");
  const pctEl = document.getElementById("crowd-percentage");
  const fillEl = document.getElementById("crowd-meter-fill");
  const waitEl = document.getElementById("crowd-wait-time");
  const recEl = document.getElementById("crowd-recommendation");
  const chartEl = document.getElementById("crowd-hourly-chart");
  const signalsEl = document.getElementById("crowd-social-signals");

  try {
    const res = await YM.api.getCrowdEstimate(slug);
    const level = res.level || "moderate";
    const percentage = res.percentage || 50;

    const labelMap = {
      low: "🟢 Low (Quiet)",
      moderate: "🟡 Moderate (Normal)",
      high: "🟠 High (Busy)",
      very_high: "🔴 Peak Rush (Heavy queues)",
    };

    if (badgeEl) {
      badgeEl.textContent = labelMap[level] || level.toUpperCase();
      badgeEl.className = `crowd-badge crowd-badge--${level}`;
    }

    if (pctEl) pctEl.textContent = `${percentage}%`;
    if (fillEl) fillEl.style.width = `${percentage}%`;
    if (waitEl) waitEl.textContent = `Est. queue wait: ${res.estimatedWaitTime || "15-20 mins"}`;
    if (recEl) recEl.textContent = res.recommendation || "Visit during morning or late afternoon hours.";

    // Render 24-Hour Hourly Footfall Curve
    if (chartEl && Array.isArray(res.hourlyForecast)) {
      chartEl.innerHTML = res.hourlyForecast
        .map((h) => {
          const heightPct = Math.max(h.percentage, 10);
          return `
            <div class="crowd-bar-col${h.isCurrent ? " crowd-bar-col--current" : ""}" title="${h.label}: ${h.percentage}% Footfall (${h.level})">
              <div class="crowd-bar-fill" style="height: ${heightPct}%;"></div>
              <span class="crowd-bar-label">${h.label.replace(" ", "")}</span>
            </div>
          `;
        })
        .join("");
    }

    // Render Live Social Media & Sensor Signals
    if (signalsEl && res.socialMediaSignals) {
      signalsEl.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:0.2rem;">
          <span>🔥 Social Geotag Buzz:</span>
          <strong>${res.socialMediaSignals.trend} (${res.socialMediaSignals.buzzScore}/100)</strong>
        </div>
        <div style="display:flex; justify-content:space-between; color:var(--ink-light); font-size:0.72rem;">
          <span>Model: ${res.model || "CrowdPredictor"}</span>
          <span>Weather: ${res.weatherSource || "Live IMD/NASA"}</span>
        </div>
      `;
    }
  } catch (err) {
    console.error("Crowd estimate failed:", err);
    if (badgeEl) badgeEl.textContent = "Unavailable";
    if (pctEl) pctEl.textContent = "--%";
    if (waitEl) waitEl.textContent = "Live radar unavailable";
  }

  // Bind AI Live Photo Scanner & GPS Check-In
  setupCrowdTools(slug);

  // Bind Manual Observation Report
  const reportBlock = document.getElementById("crowd-report-block");
  const loginHint = document.getElementById("crowd-login-hint");
  if (YM.auth.isLoggedIn()) {
    if (reportBlock) reportBlock.hidden = false;
    if (loginHint) loginHint.hidden = true;
    const reportBtn = document.getElementById("crowd-report-btn");
    if (reportBtn && !reportBtn.dataset.bound) {
      reportBtn.dataset.bound = "true";
      reportBtn.addEventListener("click", async () => {
        const level = document.getElementById("crowd-report-select").value;
        const status = document.getElementById("crowd-report-status");
        status.textContent = "Submitting observation…";
        try {
          await YM.api.submitCrowdReport(currentSlug, level);
          status.textContent = "Thanks! Your observation calibrated the live radar.";
          setTimeout(() => loadCrowd(currentSlug), 1000);
        } catch (err) {
          status.textContent = `Couldn't submit: ${err.message}`;
        }
      });
    }
  } else {
    if (reportBlock) reportBlock.hidden = true;
    if (loginHint) loginHint.hidden = false;
  }
}

function setupCrowdTools(slug) {
  const openVisionBtn = document.getElementById("btn-open-vision-scanner");
  const closeVisionBtn = document.getElementById("btn-close-vision");
  const visionBlock = document.getElementById("vision-scanner-block");
  const runVisionBtn = document.getElementById("btn-run-vision");
  const fileInput = document.getElementById("vision-file-input");
  const resultDiv = document.getElementById("vision-scan-result");
  const gpsBtn = document.getElementById("btn-gps-checkin");
  const gpsStatus = document.getElementById("crowd-gps-status");

  // Toggle Vision Block
  if (openVisionBtn && !openVisionBtn.dataset.bound) {
    openVisionBtn.dataset.bound = "true";
    openVisionBtn.addEventListener("click", () => {
      if (visionBlock) visionBlock.hidden = !visionBlock.hidden;
    });
  }

  if (closeVisionBtn && !closeVisionBtn.dataset.bound) {
    closeVisionBtn.dataset.bound = "true";
    closeVisionBtn.addEventListener("click", () => {
      if (visionBlock) visionBlock.hidden = true;
    });
  }

  // Handle Photo File Upload
  if (fileInput && !fileInput.dataset.bound) {
    fileInput.dataset.bound = "true";
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          _selectedVisionImageBase64 = reader.result;
          if (resultDiv) resultDiv.innerHTML = `<span style="color:var(--teal);">Photo loaded (${Math.round(file.size / 1024)} KB). Click Analyze.</span>`;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Sample Preset Chips
  document.querySelectorAll(".sample-vision-chip").forEach((chip) => {
    if (!chip.dataset.bound) {
      chip.dataset.bound = "true";
      chip.addEventListener("click", () => {
        const preset = chip.dataset.preset;
        // Generate simulated test image base64
        const dummyBytes = preset === "packed" ? "A".repeat(450000) : preset === "busy" ? "B".repeat(180000) : "C".repeat(25000);
        _selectedVisionImageBase64 = `data:image/jpeg;base64,${btoa(dummyBytes.slice(0, 5000))}`;
        if (resultDiv) resultDiv.innerHTML = `<span style="color:var(--gold-dark); font-weight:600;">Selected sample: "${chip.textContent}". Click Analyze below.</span>`;
      });
    }
  });

  // Run AI Vision Analysis
  if (runVisionBtn && !runVisionBtn.dataset.bound) {
    runVisionBtn.dataset.bound = "true";
    runVisionBtn.addEventListener("click", async () => {
      if (!_selectedVisionImageBase64) {
        if (resultDiv) resultDiv.innerHTML = `<span style="color:#d32f2f;">Please select a photo or sample first!</span>`;
        return;
      }
      if (resultDiv) resultDiv.innerHTML = `<span>⏳ AI is analyzing human clustering and gate density…</span>`;

      try {
        const vision = await YM.api.analyzeCrowdPhoto(currentSlug, _selectedVisionImageBase64);
        if (resultDiv) {
          resultDiv.innerHTML = `
            <div style="background:#fff; border:1px solid var(--line); border-radius:var(--radius-sm); padding:0.5rem; margin-top:0.4rem;">
              <div style="display:flex; justify-content:space-between; font-weight:700; color:var(--maroon-dark); margin-bottom:0.2rem;">
                <span>Detected: ${vision.crowd_level?.toUpperCase()}</span>
                <span>${vision.percentage}% Density</span>
              </div>
              <p style="margin:0 0 0.2rem; font-size:0.72rem; color:var(--ink);">${vision.summary}</p>
              <span style="font-size:0.68rem; color:var(--ink-light);">Est. count: ${vision.estimated_people_count} · Confidence: ${vision.confidence}</span>
            </div>
          `;
        }
        // Refresh live crowd radar to reflect new vision detection
        loadCrowd(currentSlug);
      } catch (err) {
        if (resultDiv) resultDiv.innerHTML = `<span style="color:#d32f2f;">Analysis failed: ${err.message}</span>`;
      }
    });
  }

  // Live Phone GPS Check-In
  if (gpsBtn && !gpsBtn.dataset.bound) {
    gpsBtn.dataset.bound = "true";
    gpsBtn.addEventListener("click", () => {
      if (!navigator.geolocation) {
        if (gpsStatus) gpsStatus.textContent = "Geolocation is not supported by your browser.";
        return;
      }
      if (gpsStatus) gpsStatus.textContent = "Acquiring live GPS fix…";

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          try {
            const checkin = await YM.api.checkInGps(currentSlug, { lat, lng });
            if (gpsStatus) {
              gpsStatus.innerHTML = checkin.verified
                ? `✅ <strong>${checkin.message}</strong>`
                : `📍 ${checkin.message}`;
            }
            loadCrowd(currentSlug);
          } catch (err) {
            if (gpsStatus) gpsStatus.textContent = `GPS check-in error: ${err.message}`;
          }
        },
        (err) => {
          if (gpsStatus) gpsStatus.textContent = `GPS location access denied (${err.message}).`;
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
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
      const langPrefix = utterance.lang.split("-")[0];
      const matchingVoices = voices.filter(
        (v) => v.lang.toLowerCase().startsWith(langPrefix) || v.lang.toLowerCase() === utterance.lang.toLowerCase()
      );
      const matchedVoice =
        matchingVoices.find((v) => /natural|neural|online|google|siri/i.test(v.name)) ||
        matchingVoices[0] ||
        voices.find((v) => /natural|neural|online|google/i.test(v.name));
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
