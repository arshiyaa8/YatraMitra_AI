/**
 * home-assistant.js — Voice-First AI Heritage Assistant Homepage Controller.
 * Grounded in Python ML models: Crowd Predictor, Best Time Analyzer,
 * Hidden Gems Promoter, Route Planner, Laws & Etiquette, and Food Guides.
 */

let recognition = null;
let isRecording = false;
let currentSynthUtterance = null;

document.addEventListener("DOMContentLoaded", () => {
  // Ensure default nationality if not set yet
  if (!YM.nationality.get()) {
    YM.nationality.set("indian");
  }

  YM.renderHeader("assistant");
  YM.renderAlertBanner("alert-banner-host");
  YM.renderFestivalBanner("festival-banner-host");

  setupSpeechRecognition();
  setupVoiceOrb();
  setupVoicePersonaPicker();
  setupChatForm();
  setupQuickChips();
  applyLanguageToAssistantUI();

  // Listen for language dropdown changes and re-render homepage UI
  window.addEventListener("ym-lang-changed", () => {
    applyLanguageToAssistantUI();
  });
});

function applyLanguageToAssistantUI() {
  const heroTitle = document.querySelector(".assistant-hero h1");
  const heroSubtitle = document.querySelector(".assistant-hero p");
  const statusText = document.getElementById("voice-status-text");
  const voiceLabel = document.querySelector(".voice-persona-picker span");
  const chatInput = document.getElementById("chat-input");
  const chatSubmitBtn = document.querySelector("#chat-form button[type='submit']");
  const chips = document.querySelectorAll(".quick-chip");

  if (heroTitle) heroTitle.textContent = YM.t("assistant_title", "Namaste, I am YatraMitra AI");
  if (heroSubtitle) heroSubtitle.textContent = YM.t("assistant_subtitle", "Your multilingual voice-enabled heritage travel companion. Ask me anything about crowd predictions, best visiting hours, hidden gems, travel laws, or regional cuisines.");
  if (statusText && !isRecording) statusText.textContent = YM.t("voice_tap_prompt", "Tap microphone to speak or type below");
  if (voiceLabel) voiceLabel.textContent = YM.t("ai_voice_label", "🎙️ AI Voice:");
  if (chatInput) chatInput.placeholder = YM.t("chat_placeholder", "Ask about crowd levels, best visiting hours, hidden gems…");
  if (chatSubmitBtn) chatSubmitBtn.textContent = YM.t("ask_ai_btn", "Ask AI →");

  const chipMap = [
    "chip_crowd",
    "chip_best_time",
    "chip_gems",
    "chip_drone_rules",
    "chip_food",
    "chip_accessible"
  ];
  chips.forEach((chip, idx) => {
    if (chipMap[idx]) {
      chip.textContent = YM.t(chipMap[idx], chip.textContent);
    }
  });

  // Update default welcome bubble if user hasn't chatted yet
  const welcomeBubble = document.querySelector(".chat-msg--assistant .chat-bubble");
  if (welcomeBubble && document.querySelectorAll(".chat-msg").length === 1) {
    welcomeBubble.innerHTML = `
      <p><strong>${YM.t("welcome_title", "🙏 Welcome to YatraMitra!")}</strong></p>
      <p>${YM.t("welcome_desc", "I am connected directly to our machine learning engines for Live Crowd Estimations, Optimal Visit Times, Hidden Gem Scoring, and Indian Heritage & Law Databases.")}</p>
      <p>${YM.t("welcome_prompt", "Tap the microphone above or type any question below to begin!")}</p>
    `;
  }

  // Also sync Speech Recognition language
  if (recognition) {
    const langMap = {
      en: "en-IN",
      hi: "hi-IN",
      ta: "ta-IN",
      te: "te-IN",
      bn: "bn-IN",
      mr: "mr-IN",
      gu: "gu-IN",
      kn: "kn-IN",
      ml: "ml-IN",
      pa: "pa-IN",
      or: "or-IN",
      as: "as-IN",
    };
    recognition.lang = langMap[YM.lang.get()] || "en-IN";
  }
}

function setupVoicePersonaPicker() {
  const select = document.getElementById("ym-voice-speaker-select");
  if (!select) return;

  const saved = localStorage.getItem("ym_selected_voice") || "anushka";
  select.value = saved;

  select.addEventListener("change", (e) => {
    localStorage.setItem("ym_selected_voice", e.target.value);
  });
}

// ── Speech Recognition Setup ────────────────────────────────────────
function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("Speech Recognition API not supported in this browser.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;

  // Sync language with current global selection
  const langMap = {
    en: "en-IN",
    hi: "hi-IN",
    ta: "ta-IN",
    te: "te-IN",
    bn: "bn-IN",
    mr: "mr-IN",
    gu: "gu-IN",
    kn: "kn-IN",
    ml: "ml-IN",
    pa: "pa-IN",
    or: "or-IN",
    as: "as-IN",
  };
  recognition.lang = langMap[YM.lang.get()] || "en-IN";

  recognition.onstart = () => {
    isRecording = true;
    updateVoiceUI(true, "🎙️ Listening... Speak your travel question now");
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById("chat-input").value = transcript;
    updateVoiceUI(false, `Heard: "${transcript}"`);
    handleSendMessage(transcript);
  };

  recognition.onerror = (event) => {
    console.warn("Speech recognition error:", event.error);
    isRecording = false;
    updateVoiceUI(false, "Could not hear audio. Tap to try again.");
  };

  recognition.onend = () => {
    isRecording = false;
    updateVoiceUI(false, "Tap microphone to speak or type below");
  };
}

function toggleVoiceRecording() {
  if (!recognition) {
    alert("Voice recognition is not supported in this browser. Please type your question in the text box below.");
    return;
  }

  if (isRecording) {
    recognition.stop();
  } else {
    // Update recognition language from global language state
    const langMap = {
      en: "en-IN",
      hi: "hi-IN",
      ta: "ta-IN",
      te: "te-IN",
      bn: "bn-IN",
      mr: "mr-IN",
      gu: "gu-IN",
      kn: "kn-IN",
      ml: "ml-IN",
      pa: "pa-IN",
      or: "or-IN",
      as: "as-IN",
    };
    recognition.lang = langMap[YM.lang.get()] || "en-IN";
    try {
      recognition.start();
    } catch (e) {
      console.warn("Recognition already started:", e);
    }
  }
}

function updateVoiceUI(active, text) {
  const orb = document.getElementById("voice-orb-btn");
  const micInput = document.getElementById("mic-input-btn");
  const statusEl = document.getElementById("voice-status-text");

  if (active) {
    if (orb) orb.classList.add("is-listening");
    if (micInput) micInput.classList.add("active-listening");
  } else {
    if (orb) orb.classList.remove("is-listening");
    if (micInput) micInput.classList.remove("active-listening");
  }

  if (statusEl && text) {
    statusEl.textContent = text;
  }
}

// ── Voice Output / Text-To-Speech ──────────────────────────────────
let assistantAudioPlayer = null;

async function speakAssistantResponse(text) {
  if (!text) return;

  // Stop any ongoing speech or audio
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  if (assistantAudioPlayer) {
    assistantAudioPlayer.pause();
  }

  // 1. Studio Neural Voice via Sarvam AI API
  const currentSpeaker = localStorage.getItem("ym_selected_voice") || "anushka";
  try {
    const res = await YM.api.textToSpeech({ text: text, language: YM.lang.get(), speaker: currentSpeaker });
    if (res && res.audioBase64) {
      if (!assistantAudioPlayer) assistantAudioPlayer = new Audio();
      assistantAudioPlayer.src = `data:audio/wav;base64,${res.audioBase64}`;
      await assistantAudioPlayer.play();
      return;
    }
  } catch (err) {
    console.warn("Studio neural TTS failed, falling back to browser speech:", err);
  }

  // 2. Client-side Web Speech API Fallback
  speakText(text);
}

function speakText(text) {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  // Strip markdown formatting so voice reads cleanly like human speech
  const cleanText = text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/#/g, "")
    .replace(/`/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  const langMap = {
    en: "en-IN",
    hi: "hi-IN",
    ta: "ta-IN",
    te: "te-IN",
    bn: "bn-IN",
    mr: "mr-IN",
    gu: "gu-IN",
    kn: "kn-IN",
    ml: "ml-IN",
    pa: "pa-IN",
  };
  const targetLang = langMap[YM.lang.get()] || "en-IN";
  utterance.lang = targetLang;
  utterance.rate = 0.95; // Natural human pacing
  utterance.pitch = 1.0;

  // Automatically select modern Natural / Neural / HD voices if installed
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    const langPrefix = targetLang.split("-")[0];
    const matchingVoices = voices.filter(
      (v) => v.lang.toLowerCase().startsWith(langPrefix) || v.lang.toLowerCase() === targetLang.toLowerCase()
    );

    const bestVoice =
      matchingVoices.find((v) => /natural|neural|online|google|siri/i.test(v.name)) ||
      matchingVoices[0] ||
      voices.find((v) => /natural|neural|online|google/i.test(v.name));

    if (bestVoice) {
      utterance.voice = bestVoice;
    }
  }

  window.speechSynthesis.speak(utterance);
}

// ── Chat Form & Interaction ─────────────────────────────────────────
function setupChatForm() {
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const msg = input.value.trim();
      if (!msg) return;
      input.value = "";
      handleSendMessage(msg);
    });
  }
}

function setupVoiceOrb() {
  const orb = document.getElementById("voice-orb-btn");
  const micInput = document.getElementById("mic-input-btn");

  if (orb) orb.addEventListener("click", toggleVoiceRecording);
  if (micInput) micInput.addEventListener("click", toggleVoiceRecording);
}

function setupQuickChips() {
  document.querySelectorAll(".quick-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const prompt = chip.getAttribute("data-prompt") || chip.textContent.trim();
      handleSendMessage(prompt);
    });
  });
}

// ── Message Processing & Dispatcher ────────────────────────────────
async function handleSendMessage(text) {
  const stream = document.getElementById("chat-stream");
  if (!stream) return;

  // 1. Render user message bubble
  appendUserMessage(text);

  // 2. Render assistant loading state
  const loadingBubble = appendLoadingMessage();

  try {
    const res = await YM.api.askAssistant(text, YM.lang.get());
    loadingBubble.remove();

    // 3. Render Assistant Response
    appendAssistantMessage(res);

    // 4. Voice synthesize the response with studio neural voice
    if (res.voiceText) {
      speakAssistantResponse(res.voiceText);
    }
  } catch (err) {
    loadingBubble.remove();
    appendAssistantMessage({
      reply: `Sorry, I couldn't process that query right now: ${err.message}. Please check if the backend is running.`,
      suggestions: ["How crowded is Taj Mahal?", "Show me hidden gems in India"],
    });
  }

  // Smooth scroll
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

function appendUserMessage(text) {
  const stream = document.getElementById("chat-stream");
  const msg = document.createElement("div");
  msg.className = "chat-msg chat-msg--user";
  msg.innerHTML = `
    <div class="chat-bubble">
      ${YM.util.escapeHtml(text)}
    </div>
  `;
  stream.appendChild(msg);
}

function appendLoadingMessage() {
  const stream = document.getElementById("chat-stream");
  const msg = document.createElement("div");
  msg.className = "chat-msg chat-msg--assistant";
  msg.innerHTML = `
    <div class="chat-bubble" style="color:var(--ink-soft); font-style:italic;">
      ✨ Consulting AI ML models & database…
    </div>
  `;
  stream.appendChild(msg);
  return msg;
}

function appendAssistantMessage(data) {
  const stream = document.getElementById("chat-stream");
  const msg = document.createElement("div");
  msg.className = "chat-msg chat-msg--assistant";

  // Parse simple markdown bold and bullet lines into HTML
  let formattedHtml = data.reply
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .split("\n\n")
    .map((block) => {
      if (block.startsWith("• ") || block.startsWith("1. ") || block.startsWith("2. ") || block.startsWith("3. ")) {
        const items = block
          .split("\n")
          .map((line) => `<li>${line.replace(/^[•\d\.\s]+/, "")}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${block.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("");

  // Quick stats pills
  let statsHtml = "";
  if (data.quickFacts && data.quickFacts.length > 0) {
    statsHtml = `
      <div class="chat-quick-stats">
        ${data.quickFacts.map((q) => `<span class="stat-pill">${YM.util.escapeHtml(q.label)}: <strong>${YM.util.escapeHtml(q.value)}</strong></span>`).join("")}
      </div>
    `;
  }

  // Monument destination previews
  const isHi = YM.lang.get() === "hi";
  let destinationCardsHtml = "";
  if (data.monuments && data.monuments.length > 0) {
    destinationCardsHtml = `
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:0.6rem; margin:0.8rem 0;">
        ${data.monuments
          .map((m) => {
            const loc = YM.i18n.getMonument(m.slug, m.name, m.shortDescription);
            const mName = loc.name;
            const img = m.images && m.images.length > 0 ? m.images[0] : "";
            return `
              <div style="background:#fff; border:1px solid var(--line); border-radius:var(--radius-sm); overflow:hidden; box-shadow:var(--shadow-card); display:flex; flex-direction:column;">
                ${img ? `<div style="height:80px; background-image:url('${img}'); background-size:cover; background-position:center;"></div>` : ""}
                <div style="padding:0.5rem; flex:1; display:flex; flex-direction:column;">
                  <strong style="font-size:0.85rem; color:var(--maroon-dark);">${YM.util.escapeHtml(mName)}</strong>
                  <span style="font-size:0.75rem; color:var(--ink-soft); margin-bottom:0.4rem;">${YM.util.escapeHtml(m.state)}</span>
                  <a href="monument.html?slug=${encodeURIComponent(m.slug)}" style="font-size:0.78rem; color:var(--teal-dark); font-weight:600; text-decoration:none; margin-top:auto;">${isHi ? "मार्गदर्शिका देखें →" : "View Guide &rarr;"}</a>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  // Follow-up suggestions
  let suggestionsHtml = "";
  if (data.suggestions && data.suggestions.length > 0) {
    suggestionsHtml = `
      <div style="margin-top:0.75rem; border-top:1px dashed var(--line); padding-top:0.5rem;">
        <span style="font-size:0.75rem; color:var(--ink-soft); font-weight:600;">${isHi ? "सुझाए गए अगले प्रश्न:" : "Suggested follow-ups:"}</span>
        <div style="display:flex; flex-wrap:wrap; gap:0.35rem; margin-top:0.3rem;">
          ${data.suggestions
            .map((s) => `<button type="button" class="quick-chip" style="font-size:0.78rem; padding:0.25rem 0.6rem;" onclick="window.YM_askAssistant('${YM.util.escapeHtml(s)}')">${YM.util.escapeHtml(s)}</button>`)
            .join("")}
        </div>
      </div>
    `;
  }

  msg.innerHTML = `
    <div class="chat-bubble">
      ${formattedHtml}
      ${statsHtml}
      ${destinationCardsHtml}
      <button type="button" class="chat-audio-btn" onclick="window.YM_speak('${YM.util.escapeHtml(data.voiceText || "")}')">
        ${isHi ? "🔊 आवाज़ सुनें" : "🔊 Listen to Voice Audio"}
      </button>
      ${suggestionsHtml}
    </div>
  `;

  stream.appendChild(msg);
}

// Global hook for suggestion buttons
window.YM_askAssistant = function (text) {
  handleSendMessage(text);
};

window.YM_speak = function (text) {
  speakAssistantResponse(text);
};
