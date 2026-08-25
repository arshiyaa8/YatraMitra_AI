/**
 * app.js — shared across every page: auth state, preferred language,
 * the local "my trip" list, header + mobile bottom nav, and live
 * alert/festival banners.
 */

// NOTE: YM is already declared (const) by config.js, which loads before this
// file on every page — do not redeclare it here, just use it directly below.

// ── Storage keys ────────────────────────────────────────────────────
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

// ── Nationality (no longer gatekept or bifurcated) ─────────────────
YM.nationality = {
  get() {
    return "all";
  },
  set() {},
  clear() {},
  label() {
    return "";
  },
  require() {
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

// ── Comprehensive Multilingual UI Dictionary ─────────────────────────
YM.i18n = {
  dict: {
    hi: {
      nav_assistant: "AI गाइड",
      nav_explore: "अन्वेषण",
      nav_festivals: "त्यौहार",
      nav_alerts: "सुरक्षा अलर्ट",
      nav_laws: "नियम व शिष्टाचार",
      nav_account: "खाता",
      login: "लॉग इन",
      logout: "लॉग आउट",
      change: "बदलें",
      explore_title: "विरासत स्थलों का अन्वेषण करें",
      explore_subtitle: "नाम, राज्य या क्षेत्र से खोजें। प्रत्येक परिणाम वास्तविक स्मारक डेटाबेस से आता है।",
      search_placeholder: "उदा. ताजमहल, राजस्थान, किले…",
      all_states: "सभी राज्य",
      all_categories: "सभी श्रेणियां",
      cat_monument: "स्मारक",
      cat_temple: "मंदिर",
      cat_fort: "किला",
      cat_museum: "संग्रहालय",
      cat_natural: "प्राकृतिक स्थल",
      cat_wildlife: "वन्यजीव",
      cat_other: "अन्य",
      search_btn: "खोजें",
      underexplored_label: "केवल कम ज्ञात स्थल",
      near_me_btn: "📍 मेरे पास",
      cards_tab: "🗂️ कार्ड्स",
      map_tab: "🗺️ इंटरैक्टिव मानचित्र",
      view_details: "विवरण देखें →",
      free_entry: "निःशुल्क प्रवेश",
      entry_fee: "प्रवेश शुल्क",
      underexplored_gem: "कम ज्ञात स्थल",
      accessible_badge: "दिव्यांगजनों हेतु सुलभ",
      destinations_found: "गंतव्य मिले",
      destination_found: "गंतव्य मिला",
      route_closest: "🧭 निकटतम स्थल का मार्ग",
      my_location: "📍 मेरा स्थान",
      open_gps_nav: "🧭 जीपीएस नेविगेशन खोलें →",
      view_guide: "मार्गदर्शिका देखें",
      clear_route: "मार्ग हटाएं",
      assistant_title: "नमस्ते, मैं यात्रामित्रा AI हूँ",
      assistant_subtitle: "आपका बहुभाषी वॉइस-सक्षम विरासत यात्रा साथी। भीड़ का अनुमान, यात्रा का उत्तम समय, कम ज्ञात स्थल, नियम और स्थानीय व्यंजनों के बारे में कुछ भी पूछें।",
      voice_tap_prompt: "बोलने के लिए माइक दबाएं या नीचे लिखें",
      ai_voice_label: "🎙️ AI आवाज़:",
      chip_crowd: "👥 ताजमहल में आज भीड़",
      chip_best_time: "🕒 हम्पी घूमने का उत्तम समय",
      chip_gems: "💎 कम ज्ञात ऐतिहासिक स्थल",
      chip_drone_rules: "📜 ड्रोन व कैमरा नियम",
      chip_food: "🍲 दिल्ली का प्रसिद्ध भोजन",
      chip_accessible: "♿ सुलभ विरासत स्थल",
      welcome_title: "🙏 यात्रामित्रा में आपका स्वागत है!",
      welcome_desc: "मैं सीधे लाइव भीड़ अनुमान, यात्रा का उत्तम समय, गुप्त स्थल स्कोरिंग और भारतीय विरासत व कानून मॉडल से जुड़ा हूँ।",
      welcome_prompt: "शुरू करने के लिए ऊपर माइक दबाएं या नीचे कोई भी प्रश्न लिखें!",
      chat_placeholder: "भीड़ स्तर, घूमने का समय, प्रसिद्ध स्थल के बारे में पूछें…",
      ask_ai_btn: "पूछें →",
    },
    ta: {
      nav_assistant: "AI வழிகாட்டி",
      nav_explore: "ஆராயுங்கள்",
      nav_festivals: "திருவிழாக்கள்",
      nav_alerts: "எச்சரிக்கைகள்",
      nav_laws: "விதிகள்",
      nav_account: "கணக்கு",
      explore_title: "பாரம்பரிய தளங்களை ஆராயுங்கள்",
      explore_subtitle: "பெயர், மாநிலம் மூலம் தேடுங்கள்.",
      search_placeholder: "எ.கா. தாஜ்மஹால், கோட்டைகள்...",
      search_btn: "தேடுங்கள்",
      cards_tab: "🗂️ அட்டைகள்",
      map_tab: "🗺️ வரைபடம்",
      view_details: "விவரங்களை காண்க →",
    },
    te: {
      nav_assistant: "AI గైడ్",
      nav_explore: "అన్వేషించండి",
      nav_festivals: "పండుగలు",
      nav_alerts: "హెచ్చరికలు",
      nav_laws: "నియమాలు",
      nav_account: "ఖాతా",
      explore_title: "వారసత్వ ప్రదేశాలను అన్వేషించండి",
      explore_subtitle: "పేరు లేదా రాష్ట్రం ద్వారా శోధించండి.",
      search_placeholder: "ఉదా. తాజ్ మహల్, కోటలు...",
      search_btn: "శోధించండి",
      cards_tab: "🗂️ కార్డ్‌లు",
      map_tab: "🗺️ మ్యాప్",
      view_details: "వివరాలు చూడండి →",
    },
    bn: {
      nav_assistant: "AI গাইড",
      nav_explore: "অন্বেষণ করুন",
      nav_festivals: "উৎসব",
      nav_alerts: "সতর্কতা",
      nav_laws: "নিয়মাবলী",
      nav_account: "অ্যাকাউন্ট",
      explore_title: "ঐতিহ্যবাহী স্থান অন্বেষণ করুন",
      search_btn: "অনুসন্ধান",
      cards_tab: "🗂️ কার্ড",
      map_tab: "🗺️ মানচিত্র",
      view_details: "বিস্তারিত দেখুন →",
    },
    mr: {
      nav_assistant: "AI मार्गदर्शक",
      nav_explore: "शोधा",
      nav_festivals: "सण",
      nav_alerts: "इशारे",
      nav_laws: "नियम",
      nav_account: "खाते",
      explore_title: "वारसा स्थळे शोधा",
      search_btn: "शोधा",
      cards_tab: "🗂️ कार्डे",
      map_tab: "🗺️ नकाशा",
      view_details: "तपशील पहा →",
    }
  },
  monuments: {
    hi: {
      "taj-mahal": { name: "ताजमहल", desc: "मुमताज महल के लिए शाहजहाँ द्वारा निर्मित हाथीदांत-सफेद संगमरमर का मकबरा।" },
      "agra-fort": { name: "आगरा का किला", desc: "यमुना नदी के तट पर विशाल लाल बलुआ पत्थर का मुगल किला।" },
      "fatehpur-sikri": { name: "फतेहपुर सीकरी", desc: "अकबर द्वारा निर्मित लाल बलुआ पत्थर की ऐतिहासिक राजधानी और बुलंद दरवाजा।" },
      "qutub-minar": { name: "कुतुब मीनार", desc: "दिल्ली सल्तनत की ऐतिहासिक विजय मीनार और यूनेस्को विश्व धरोहर स्थल।" },
      "red-fort": { name: "लाल किला", desc: "पुरानी दिल्ली में शाहजहाँ द्वारा निर्मित ऐतिहासिक मुगल किला।" },
      "humayuns-tomb": { name: "हुमायूँ का मकबरा", desc: "मुगल सम्राट हुमायूँ का भव्य चारबाग शैली का मकबरा, ताजमहल का प्रेरणा स्रोत।" },
      "hawa-mahal": { name: "हवा महल", desc: "जयपुर का प्रसिद्ध 953 झरोखों वाला गुलाबी बलुआ पत्थर का राजमहल।" },
      "amer-fort": { name: "आमेर का किला", desc: "माओटा झील के ऊपर पहाड़ी पर स्थित भव्य राजपूत किला और शीश महल।" },
      "mehrangarh-fort": { name: "मेहरानगढ़ किला", desc: "जोधपुर में 120 मीटर ऊंची पहाड़ी पर स्थित विशाल ऐतिहासिक किला।" },
      "jaisalmer-fort": { name: "जैसलमेर का किला", desc: "थार रेगिस्तान में स्थित ऐतिहासिक 'सोनार किला' (स्वर्ण दुर्ग)।" },
      "gateway-of-india": { name: "गेटवे ऑफ इंडिया", desc: "मुंबई के तट पर अरब सागर के सामने स्थित ऐतिहासिक विजय मेहराब।" },
      "ajanta-caves": { name: "अजंता की गुफाएं", desc: "प्राचीन बौद्ध रॉक-कट गुफाएं और भित्ति चित्र।" },
      "ellora-caves": { name: "एलोरा की गुफाएं", desc: "विशाल एकल चट्टान से तराशा गया विश्व प्रसिद्ध कैलाश मंदिर।" },
      "mysore-palace": { name: "मैसूर पैलेस", desc: "वाडियार राजवंश का भव्य इंडो-सरैसेनिक शैली का राजमहल।" },
      "hampi": { name: "हम्पी स्मारक समूह", desc: "विजयनगर साम्राज्य की प्राचीन राजधानी और प्रसिद्ध पत्थर का रथ।" },
      "meenakshi-temple": { name: "मीनाक्षी अम्मन मंदिर", desc: "मदुरै में स्थित द्रविड़ स्थापत्य कला का भव्य ऐतिहासिक मंदिर।" },
      "brihadeeswarar-temple": { name: "बृहदीश्वर मंदिर", desc: "तंजாவूर में चोल राजवंश द्वारा निर्मित विशाल ग्रेनाइट मंदिर।" },
      "mahabalipuram-shore-temple": { name: "महाबलीपुरम शोर मंदिर", desc: "बंगाल की खाड़ी के तट पर 8वीं शताब्दी का रॉक-कट मंदिर।" },
      "konark-sun-temple": { name: "कोणार्क सूर्य मंदिर", desc: "ओडिशा में 24 पहियों वाले सूर्य रथ के आकार का अद्भुत मंदिर।" },
      "khajuraho": { name: "खजुराहो स्मारक समूह", desc: "चंदेल राजवंश द्वारा निर्मित नागर शैली के प्राचीन नक्काशीदार मंदिर।" },
      "sanchi-stupa": { name: "सांची का महान स्तूप", desc: "सम्राट अशोक द्वारा स्थापित प्राचीन बौद्ध स्तूप और तोरण द्वार।" },
      "golden-temple": { name: "स्वर्ण मंदिर (श्री हरमंदिर साहिब)", desc: "अमृतसर में सिखों का सबसे पवित्र धार्मिक स्थल और अमृत सरोवर।" },
      "majuli-island": { name: "माजुली द्वीप", desc: "ब्रह्मपुत्र नदी पर स्थित विश्व का सबसे बड़ा नदी द्वीप और वैष्णव सत्र।" },
      "kaziranga": { name: "काजीरंगा राष्ट्रीय उद्यान", desc: "एक सींग वाले भारतीय गैंडों का प्रसिद्ध प्राकृतिक यूनेस्को अभयारण्य।" },
      "living-root-bridges": { name: "जीवित जड़ पुल (चेरापूंजी)", desc: "मेघालय में जीवित पेड़ों की जड़ों से बुने गए अद्भुत प्राकृतिक पुल।" },
      "rumtek-monastery": { name: "रुमटेक मठ (सिक्किम)", desc: "तिब्बती बौद्ध धर्म के काग्यू संप्रदाय का प्रसिद्ध पहाड़ी मठ।" },
      "basilica-of-bom-jesus": { name: "बेसिलिका ऑफ बॉम जीसस (गोवा)", desc: "सेंट फ्रांसिस जेवियर के अवशेषों को सुरक्षित रखने वाला यूनेस्को चर्च।" },
      "charminar": { name: "चारमीनार (हैदराबाद)", desc: "1591 में कुली कुतुब शाह द्वारा निर्मित हैदराबाद का प्रतिष्ठित स्मारक।" },
      "rani-ki-vav": { name: "रानी की वाव (पाटन)", desc: "गुजरात में सरस्वती नदी के तट पर 7 मंजिला अद्भुत सीढ़ीदार बावड़ी।" },
      "victoria-memorial": { name: "विक्टोरिया मेमोरियल (कोलकाता)", desc: "सफेद मकराना संगमरमर से निर्मित भव्य ब्रिटिश युगीन संग्रहालय।" },
      "modhera-sun-temple": { name: "मोढेरा सूर्य मंदिर", desc: "गुजरात में पुष्पावती नदी के तट पर सोलंकी स्थापत्य कला का सूर्य मंदिर।" }
    }
  },
  t(key, fallback = "") {
    const lang = YM.lang.get() || "en";
    if (this.dict[lang] && this.dict[lang][key]) {
      return this.dict[lang][key];
    }
    return fallback || key;
  },
  getMonument(slug, fallbackName, fallbackDesc) {
    const lang = YM.lang.get() || "en";
    if (this.monuments[lang] && this.monuments[lang][slug]) {
      return this.monuments[lang][slug];
    }
    return { name: fallbackName, desc: fallbackDesc };
  }
};
YM.t = (key, fallback) => YM.i18n.t(key, fallback);

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
    if (typeof YM.auth !== "undefined" && YM.auth.getToken() && YM.api?.addSavedDestination) {
      YM.api.addSavedDestination(slug).catch(() => {});
    }
  },
  remove(slug) {
    const list = this.get().filter((s) => s !== slug);
    localStorage.setItem(TRIP_KEY, JSON.stringify(list));
    if (typeof YM.auth !== "undefined" && YM.auth.getToken() && YM.api?.removeSavedDestination) {
      YM.api.removeSavedDestination(slug).catch(() => {});
    }
  },
  toggle(slug) {
    this.has(slug) ? this.remove(slug) : this.add(slug);
    return this.has(slug);
  },
  async sync() {
    if (typeof YM.auth === "undefined" || !YM.auth.getToken() || !YM.api?.getSavedDestinations) return;
    try {
      const res = await YM.api.getSavedDestinations();
      if (res && res.data) {
        const remoteSlugs = res.data.map((m) => (typeof m === "string" ? m : m.slug)).filter(Boolean);
        const local = this.get();
        const merged = Array.from(new Set([...local, ...remoteSlugs]));
        localStorage.setItem(TRIP_KEY, JSON.stringify(merged));
      }
    } catch (e) {
      console.warn("Trip cloud sync failed:", e);
    }
  },
  clear() {
    localStorage.removeItem(TRIP_KEY);
  },
};

// ── Shared header + mobile bottom nav ─────────────────────────────────
const NAV_ITEMS = [
  { href: "index.html", label: "AI Guide", key: "assistant", icon: "sparkle" },
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
    const currentLang = YM.lang.get();

    const LANG_GROUPS = [
      {
        group: "Global Languages",
        options: [
          { code: "en", name: "🌐 English" },
          { code: "es", name: "🇪🇸 Español (Spanish)" },
          { code: "fr", name: "🇫🇷 Français (French)" },
          { code: "de", name: "🇩🇪 Deutsch (German)" },
          { code: "ja", name: "🇯🇵 日本語 (Japanese)" },
          { code: "zh", name: "🇨🇳 中文 (Mandarin)" },
          { code: "ru", name: "🇷🇺 Русский (Russian)" },
          { code: "ar", name: "🇸🇦 العربية (Arabic)" },
          { code: "pt", name: "🇵🇹 Português (Portuguese)" },
          { code: "it", name: "🇮🇹 Italiano (Italian)" },
          { code: "ko", name: "🇰🇷 한국어 (Korean)" },
        ],
      },
      {
        group: "Indian Languages",
        options: [
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
          { code: "ur", name: "🇮🇳 اردو (Urdu)" },
          { code: "kok", name: "🇮🇳 कोंकणी (Konkani)" },
          { code: "brx", name: "🇮🇳 बड़ो (Bodo)" },
        ],
      },
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
        <div class="header-right">
          <div class="header-lang-wrapper">
            <select id="ym-global-lang-select" class="header-lang-select" aria-label="Select language" style="background: rgba(255,255,255,0.92); color: var(--primary-dark); border: 1.5px solid var(--accent-mint); border-radius: var(--radius-sm); padding: 0.2rem 0.5rem; height: 34px; font-size: 0.82rem; font-weight: 600; cursor: pointer; box-shadow: 0 2px 6px rgba(5,150,105,0.08); outline: none;">
              ${LANG_GROUPS.map(
                (grp) => `
                  <optgroup label="${grp.group}">
                    ${grp.options
                      .map(
                        (opt) =>
                          `<option value="${opt.code}" style="color:#222; font-weight:500;" ${
                            opt.code === currentLang ? "selected" : ""
                          }>${opt.name}</option>`
                      )
                      .join("")}
                  </optgroup>
                `
              ).join("")}
            </select>
          </div>
          ${
            user
              ? `<span class="header-user">Hi, ${YM.util.escapeHtml(user.name.split(" ")[0])}</span>
                 <button class="btn btn--ghost btn--sm" id="ym-logout-btn" style="height: 32px; padding: 0.25rem 0.65rem; font-size: 0.8rem; white-space: nowrap;">Log out</button>`
              : `<a href="account.html" class="btn btn--ghost btn--sm" style="height: 32px; padding: 0.25rem 0.75rem; font-size: 0.82rem; white-space: nowrap;">Log in</a>`
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

// ── Progressive Web App (PWA) Service Worker Registration ───────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .then((registration) => {
        console.log("[PWA] ServiceWorker registered with scope:", registration.scope);
      })
      .catch((err) => {
        console.warn("[PWA] ServiceWorker registration failed:", err);
      });
  });
}

// ── PWA Install Prompt Capture ──────────────────────────────────────
let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  window.deferredPwaPrompt = deferredInstallPrompt;
  window.dispatchEvent(new CustomEvent("ym-pwa-installable"));
});

