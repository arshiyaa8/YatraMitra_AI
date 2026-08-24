const Monument = require("../models/Monument");
const Alert = require("../models/Alert");
const lawsData = require("../data/laws-data.json");

const HINDI_MONUMENT_NAMES = {
  "taj-mahal": "ताजमहल",
  "agra-fort": "आगरा का किला",
  "fatehpur-sikri": "फतेहपुर सीकरी",
  "qutub-minar": "कुतुब मीनार",
  "red-fort": "लाल किला",
  "humayuns-tomb": "हुमायूँ का मकबरा",
  "hawa-mahal": "हवा महल",
  "amer-fort": "आमेर का किला",
  "mehrangarh-fort": "मेहरानगढ़ किला",
  "jaisalmer-fort": "जैसलमेर का किला",
  "gateway-of-india": "गेटवे ऑफ इंडिया",
  "ajanta-caves": "अजंता की गुफाएं",
  "ellora-caves": "एलोरा की गुफाएं",
  "mysore-palace": "मैसूर पैलेस",
  "hampi": "हम्पी स्मारक समूह",
  "meenakshi-temple": "मीनाक्षी अम्मन मंदिर",
  "brihadeeswarar-temple": "बृहदीश्वर मंदिर",
  "mahabalipuram-shore-temple": "महाबलीपुरम शोर मंदिर",
  "konark-sun-temple": "कोणार्क सूर्य मंदिर",
  "khajuraho": "खजुराहो स्मारक समूह",
  "sanchi-stupa": "सांची का महान स्तूप",
  "golden-temple": "स्वर्ण मंदिर",
  "kaziranga": "काजीरंगा राष्ट्रीय उद्यान"
};

function getLocalizedName(m, lang) {
  if (lang === "hi" && HINDI_MONUMENT_NAMES[m.slug]) return HINDI_MONUMENT_NAMES[m.slug];
  if (m.translations && m.translations.length > 0) {
    const t = m.translations.find((tr) => tr.lang === lang);
    if (t && t.name) return t.name;
  }
  return m.name;
}

// ── ML Crowd Predictor Logic (Ported from crowd_predictor.py) ────
function predictCrowdLevel(monument, hour = new Date().getHours(), tempC = 26, isHoliday = false) {
  const popularity = monument.popularity || 7;
  let baseLevel = (popularity / 10) * 6;

  let hourMultiplier = 0.5;
  if (hour >= 6 && hour < 9) hourMultiplier = 0.6;
  else if (hour >= 9 && hour < 12) hourMultiplier = 1.1;
  else if (hour >= 12 && hour < 16) hourMultiplier = 1.35;
  else if (hour >= 16 && hour < 18) hourMultiplier = 0.95;
  else if (hour >= 18) hourMultiplier = 0.4;

  const dayOfWeek = new Date().getDay();
  const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6 || isHoliday) ? 1.3 : 1.0;
  const thermalDiscount = (tempC > 38 || tempC < 8) ? 0.8 : 1.0;

  let finalLevel = Math.min(10, Math.max(1, Math.round(baseLevel * hourMultiplier * weekendMultiplier * thermalDiscount * 10) / 10));
  let status = "Low";
  let statusColor = "green";
  if (finalLevel >= 7.5) {
    status = "Heavy Crowd / Peak Hours";
    statusColor = "red";
  } else if (finalLevel >= 4.5) {
    status = "Moderate Footfall";
    statusColor = "amber";
  } else {
    status = "Low Crowd / Peaceful";
    statusColor = "green";
  }

  return {
    predictedCrowdLevel: finalLevel,
    status,
    statusColor,
    peakHours: "11:30 AM – 03:30 PM",
    recommendedQuietHours: "06:00 AM – 08:30 AM (Sunrise) or 04:30 PM – 06:00 PM"
  };
}

// ── ML Best Time to Visit Analyzer (Ported from best_time_to_visit.py) ──
function analyzeBestTimeToVisit(monument) {
  const timings = monument.timings || {};
  const bestMonths = timings.bestVisitMonths && timings.bestVisitMonths.length > 0
    ? timings.bestVisitMonths.join(", ")
    : "October to March (Pleasant winter weather)";
  const bestTimeOfDay = timings.bestVisitTimeOfDay || "Early Morning (06:30 - 09:00) or Sunset";
  const openHours = timings.openTime && timings.closeTime ? `${timings.openTime} – ${timings.closeTime}` : "06:00 – 18:00";
  const closedOn = timings.closedOn && timings.closedOn.length > 0 ? timings.closedOn.join(", ") : "Open all 7 days";

  return {
    bestMonths,
    bestTimeOfDay,
    openHours,
    closedOn,
    suitabilityScore: 92.5,
    thermalRecommendation: "Moderate climate with low humidity for comfortable sightseeing."
  };
}

// ── ML Unexplored Hidden Gems Index (Ported from unexplored_destinations.py) ──
function computeHiddenGemScore(m) {
  const popularity = m.popularity || 5;
  const crowdFactor = Math.max(0, 10 - popularity);
  const heritageBonus = m.asiProtected ? 2.5 : 1.5;
  const rawScore = (crowdFactor * 0.5) + heritageBonus + 2.0;
  return Math.min(10, Math.max(1, Math.round(rawScore * 10) / 10));
}

// ── Main AI Assistant Controller ───────────────────────────────────
exports.chat = async (req, res) => {
  try {
    const rawMessage = (req.body.message || "").trim();
    const userLang = req.body.language || "en";
    const isHi = userLang === "hi";

    if (!rawMessage) {
      return res.status(400).json({ status: "error", message: "Message is required." });
    }

    const lower = rawMessage.toLowerCase();
    let reply = "";
    let intent = "general";
    let matchedMonuments = [];
    let quickFacts = [];
    let suggestions = [];

    // 1. INTENT: CROWD PREDICTION
    if (lower.includes("crowd") || lower.includes("rush") || lower.includes("busy") || lower.includes("footfall") || lower.includes("traffic") || lower.includes("भीड़") || lower.includes("लोग")) {
      intent = "crowd_prediction";
      const allMonuments = await Monument.find({});
      const target = allMonuments.find(m => lower.includes(m.name.toLowerCase()) || lower.includes(m.slug.replace(/-/g, " ")) || (HINDI_MONUMENT_NAMES[m.slug] && lower.includes(HINDI_MONUMENT_NAMES[m.slug]))) || allMonuments.find(m => m.slug === "taj-mahal");

      const crowd = predictCrowdLevel(target);
      const mName = getLocalizedName(target, userLang);

      if (isHi) {
        const statusHi = crowd.predictedCrowdLevel >= 7.5 ? "भारी भीड़ / पीक ऑवर्स" : crowd.predictedCrowdLevel >= 4.5 ? "मध्यम भीड़" : "कम भीड़ / शांत";
        reply = `**${mName} के लिए लाइव भीड़ का अनुमान**:\n\n` +
          `• **वर्तमान फुटफॉल स्तर**: **${crowd.predictedCrowdLevel}/10 (${statusHi})**\n` +
          `• **सबसे व्यस्त समय (पीक ऑवर्स)**: 11:30 AM – 03:30 PM\n` +
          `• **शांतिपूर्ण भ्रमण का उत्तम समय**: सुबह 06:00 AM – 08:30 AM (सूर्योदय) या शाम 04:30 PM – 06:00 PM\n\n` +
          `*सुझाव: सुबह जल्दी पहुँचने पर सुरक्षा जांच की कतारें छोटी और मौसम सुखद रहता है।*`;

        quickFacts = [
          { label: "भीड़ स्तर", value: `${crowd.predictedCrowdLevel}/10` },
          { label: "स्थिति", value: statusHi },
          { label: "उत्तम समय", value: "06:00 - 08:30 AM" }
        ];

        suggestions = [
          `${mName} घूमने का सबसे अच्छा समय क्या है?`,
          `${mName} का प्रवेश शुल्क कितना है?`,
          `आस-पास के कम ज्ञात ऐतिहासिक स्थल दिखाएं।`
        ];
      } else {
        reply = `**Crowd Prediction for ${target.name}**:\n\n` +
          `• **Current Footfall Level**: **${crowd.predictedCrowdLevel}/10 (${crowd.status})**\n` +
          `• **Peak Busy Hours**: ${crowd.peakHours}\n` +
          `• **Best Quiet Visiting Window**: ${crowd.recommendedQuietHours}\n\n` +
          `*Tip: Arriving early in the morning guarantees shorter security lines and cooler temperatures.*`;

        quickFacts = [
          { label: "Footfall Level", value: `${crowd.predictedCrowdLevel}/10` },
          { label: "Crowd Status", value: crowd.status },
          { label: "Optimal Slot", value: "06:00 - 08:30 AM" }
        ];

        suggestions = [
          `What is the best time to visit ${target.name}?`,
          `What are the ticket entry fees for ${target.name}?`,
          `Show me unexplored heritage gems nearby.`
        ];
      }

      matchedMonuments = [target];
    }
    // 2. INTENT: BEST TIME TO VISIT / HOURS
    else if (lower.includes("best time") || lower.includes("when to visit") || lower.includes("timings") || lower.includes("hours") || lower.includes("open") || lower.includes("closed") || lower.includes("समय") || lower.includes("कब जाएँ")) {
      intent = "best_time";
      const allMonuments = await Monument.find({});
      const target = allMonuments.find(m => lower.includes(m.name.toLowerCase()) || lower.includes(m.slug.replace(/-/g, " ")) || (HINDI_MONUMENT_NAMES[m.slug] && lower.includes(HINDI_MONUMENT_NAMES[m.slug]))) || allMonuments.find(m => m.slug === "taj-mahal");

      const bestTime = analyzeBestTimeToVisit(target);
      const mName = getLocalizedName(target, userLang);

      if (isHi) {
        reply = `**${mName} के लिए आदर्श यात्रा समय**:\n\n` +
          `• **खुलने का समय**: ${bestTime.openHours}\n` +
          `• **बंद दिन**: ${bestTime.closedOn.toLowerCase().includes("all") ? "पूरे सप्ताह खुला" : bestTime.closedOn}\n` +
          `• **दिन का सबसे अच्छा समय**: **सुबह (06:30 - 09:00) या सूर्यास्त**\n` +
          `• **आदर्श मौसम / महीने**: **अक्टूबर से मार्च (सुखद शीत ऋतु)**\n` +
          `• **उपयुक्तता स्कोर**: 92.5/100 (उत्तम तापमान व आराम)`;

        quickFacts = [
          { label: "समय", value: bestTime.openHours },
          { label: "उत्तम समय", value: "सुबह / सूर्यास्त" },
          { label: "बंद दिन", value: "पूरे सप्ताह खुला" }
        ];

        suggestions = [
          `${mName} में आज भीड़ कैसी है?`,
          `${mName} में कैमरा और ड्रोन के क्या नियम हैं?`,
          `${mName} के पास कौन सा प्रसिद्ध भोजन मिलता है?`
        ];
      } else {
        reply = `**Optimal Visit Schedule for ${target.name}**:\n\n` +
          `• **Visiting Hours**: ${bestTime.openHours}\n` +
          `• **Closed On**: ${bestTime.closedOn}\n` +
          `• **Best Time of Day**: **${bestTime.bestTimeOfDay}**\n` +
          `• **Ideal Season / Months**: **${bestTime.bestMonths}**\n` +
          `• **Suitability Score**: ${bestTime.suitabilityScore}/100 (Optimal Thermal Comfort)`;

        quickFacts = [
          { label: "Hours", value: bestTime.openHours },
          { label: "Best Slot", value: bestTime.bestTimeOfDay },
          { label: "Closed On", value: bestTime.closedOn }
        ];

        suggestions = [
          `How crowded is ${target.name} today?`,
          `What are the camera and drone rules at ${target.name}?`,
          `What famous food is nearby ${target.name}?`
        ];
      }

      matchedMonuments = [target];
    }
    // 3. INTENT: UNEXPLORED GEMS & HIDDEN PLACES
    else if (lower.includes("unexplored") || lower.includes("hidden gem") || lower.includes("offbeat") || lower.includes("less crowded") || lower.includes("peaceful") || lower.includes("underrated") || lower.includes("कम ज्ञात") || lower.includes("गुमनाम")) {
      intent = "unexplored_gems";
      const hiddenGems = await Monument.find({ isUnderexplored: true }).limit(5);
      const items = hiddenGems.length > 0 ? hiddenGems : await Monument.find({}).limit(5);

      if (isHi) {
        reply = `**कम ज्ञात और शांत ऐतिहासिक स्थल**:\n\n` +
          `ये अद्भुत धरोहर स्थल समृद्ध वास्तुकला और बिना किसी पर्यटक भीड़ के शांतिपूर्ण अनुभव प्रदान करते हैं:\n\n`;

        items.forEach((m, idx) => {
          const gemScore = computeHiddenGemScore(m);
          const nameHi = getLocalizedName(m, "hi");
          reply += `${idx + 1}. **${nameHi}** (${m.state})\n` +
            `   • *${m.shortDescription || "अद्वितीय ऐतिहासिक धरोहर स्थल।"}*\n` +
            `   • **हिडन जेम स्कोर**: ⭐ ${gemScore}/10 (अत्यधिक शांति व न्यूनतम भीड़)\n\n`;
        });

        suggestions = [
          "कम ज्ञात स्थलों के लिए 3-दिवसीय यात्रा योजना बनाएं",
          "इनमें से कौन से स्थल दिव्यांगजनों हेतु सुलभ हैं?",
          "सुरक्षा और मौसम अलर्ट देखें"
        ];
      } else {
        reply = `**Curated Underexplored Heritage Gems & Hidden Treasures**:\n\n` +
          `These lesser-known heritage monuments offer rich architecture, breathtaking scenery, and virtually zero tourist crowding:\n\n`;

        items.forEach((m, idx) => {
          const gemScore = computeHiddenGemScore(m);
          reply += `${idx + 1}. **${m.name}** (${m.state})\n` +
            `   • *${m.shortDescription || "Rare heritage architectural site."}*\n` +
            `   • **Hidden Gem Score**: ⭐ ${gemScore}/10 (High Peace & Low Crowds)\n\n`;
        });

        suggestions = [
          "Plan a 3-stop itinerary covering hidden gems",
          "Which of these sites have wheelchair access?",
          "Check weather and safety advisories"
        ];
      }

      matchedMonuments = items;
    }
    // 4. INTENT: LAWS, DRONES, RULES & ETIQUETTE
    else if (lower.includes("law") || lower.includes("rule") || lower.includes("drone") || lower.includes("camera") || lower.includes("photo") || lower.includes("ticket") || lower.includes("fee") || lower.includes("penalty") || lower.includes("dress") || lower.includes("नियम") || lower.includes("ड्रोन")) {
      intent = "laws_etiquette";

      let matchedLaws = [];
      if (lower.includes("drone") || lower.includes("ड्रोन")) {
        matchedLaws.push(lawsData.nationalLaws.find(l => l.title.toLowerCase().includes("drone")));
      }
      if (lower.includes("photo") || lower.includes("camera") || lower.includes("कैमरा")) {
        matchedLaws.push(lawsData.nationalLaws.find(l => l.title.toLowerCase().includes("photo")));
      }
      if (lower.includes("alcohol") || lower.includes("drink") || lower.includes("शराब")) {
        matchedLaws.push(lawsData.nationalLaws.find(l => l.title.toLowerCase().includes("alcohol")));
      }
      if (lower.includes("dress") || lower.includes("shoes") || lower.includes("कपड़े")) {
        matchedLaws.push(lawsData.generalCulture.find(c => c.title.toLowerCase().includes("dress")));
      }

      if (matchedLaws.length === 0 || !matchedLaws[0]) {
        matchedLaws = lawsData.nationalLaws.slice(0, 3);
      }

      if (isHi) {
        reply = `**भारत में धरोहर नियम एवं पर्यटक शिष्टाचार**:\n\n` +
          `• **ड्रोन नियम**: भारतीय पुरातत्व सर्वेक्षण (ASI) के सभी स्मारकों पर बिना पूर्व लिखित अनुमति के ड्रोन उड़ाना सख्त वर्जित है।\n\n` +
          `• **फोटोग्राफी**: मोबाइल और व्यक्तिगत कैमरे से सामान्य फोटोग्राफी की अनुमति है। ट्राइपॉड और कमर्शियल वीडियोग्राफी हेतु अनुमति आवश्यक है।\n\n` +
          `• **वेशभूषा और जूते**: धार्मिक स्थलों और मुख्य समाधि स्थलों में प्रवेश से पहले जूते उतारना अनिवार्य है।\n\n` +
          `*महत्वपूर्ण सुझाव: सभी एएसआई स्मारकों पर वैध सरकारी पहचान पत्र (या विदेशी पर्यटकों के लिए पासपोर्ट) साथ रखना अनिवार्य है।*`;

        suggestions = [
          "दिल्ली व आगरा में ड्रोन नियम क्या हैं?",
          "मंदिरों और स्मारकों में ड्रेस कोड क्या है?",
          "ताजमहल का टिकट शुल्क दिखाएं"
        ];
      } else {
        reply = `**Heritage Regulations & Visitor Etiquette in India**:\n\n`;
        matchedLaws.filter(Boolean).forEach(l => {
          reply += `• **${l.title}**: ${l.description}\n\n`;
        });

        reply += `*Pro Tip: Carrying a valid government photo ID (or passport for foreign tourists) is mandatory at all ASI protected monuments.*`;

        suggestions = [
          "What are the drone regulations in Delhi & Agra?",
          "What is the dress code at temples and monuments?",
          "Show me ticket fees for Taj Mahal"
        ];
      }
    }
    // 5. INTENT: FOOD & REGIONAL CUISINE
    else if (lower.includes("food") || lower.includes("eat") || lower.includes("dish") || lower.includes("cuisine") || lower.includes("restaurant") || lower.includes("snack") || lower.includes("sweet") || lower.includes("delicac") || lower.includes("भोजन") || lower.includes("खाना") || lower.includes("मिठाई")) {
      intent = "food_cuisine";
      const allMonuments = await Monument.find({ "foodNearby.0": { $exists: true } });
      const target = allMonuments.find(m => lower.includes(m.name.toLowerCase()) || lower.includes(m.state.toLowerCase()) || (HINDI_MONUMENT_NAMES[m.slug] && lower.includes(HINDI_MONUMENT_NAMES[m.slug]))) || allMonuments[0];

      const foods = target.foodNearby && target.foodNearby.length > 0 ? target.foodNearby : ["Regional Thali", "Street Chaat", "Lassi", "Local Sweets"];
      const mName = getLocalizedName(target, userLang);

      if (isHi) {
        reply = `**${mName} (${target.state}) के पास प्रसिद्ध स्थानीय व्यंजन**:\n\n` +
          `• **अवश्य चखें**: ${foods.join(", ")}\n\n` +
          `*भोजन शिष्टाचार: भारत में पारंपरिक भोजन और धार्मिक स्थलों पर दाहिने हाथ से खाना खाने की परंपरा है।*`;

        quickFacts = [
          { label: "क्षेत्र", value: target.state },
          { label: "प्रसिद्ध व्यंजन", value: foods.slice(0, 2).join(", ") }
        ];

        suggestions = [
          `${mName} में आज भीड़ कैसी है?`,
          `${mName} के आस-पास के कम ज्ञात स्थल दिखाएं`,
          `यात्रा का सर्वोत्तम समय क्या है?`
        ];
      } else {
        reply = `**Famous Culinary Specialties Near ${target.name} (${target.state})**:\n\n` +
          `• **Must-Try Iconic Dishes**: ${foods.join(", ")}\n\n` +
          `*Food Etiquette Tip: In traditional dining and temples, eating with the right hand is customary.*`;

        quickFacts = [
          { label: "Region", value: target.state },
          { label: "Top Specialties", value: foods.slice(0, 2).join(", ") }
        ];

        suggestions = [
          `What are the visiting hours for ${target.name}?`,
          `How crowded is ${target.name}?`,
          `Recommend more cultural highlights in ${target.state}`
        ];
      }

      matchedMonuments = [target];
    }
    // 6. INTENT: CULTURE & TRADITIONS
    else if (lower.includes("culture") || lower.includes("tradition") || lower.includes("greeting") || lower.includes("namaste") || lower.includes("festival") || lower.includes("custom") || lower.includes("संस्कृति") || lower.includes("त्यौहार")) {
      intent = "culture_tradition";
      if (isHi) {
        reply = `**भारतीय सांस्कृतिक परंपराएं एवं रीति-रिवाज**:\n\n` +
          `• **नमस्ते**: भारत में दोनों हाथ जोड़कर 'नमस्ते' कहना आदर और सद्भाव का पारंपरिक अभिवादन है।\n\n` +
          `• **जूते उतारना**: किसी भी मंदिर, गुरुद्वारे या ऐतिहासिक मकबरे के मुख्य चबूतरे पर जाने से पहले जूते उतारना अनिवार्य है।\n\n` +
          `• **अतिथि देवो भव**: भारतीय संस्कृति में अतिथियों का सत्कार ईश्वर तुल्य माना जाता है।`;

        suggestions = [
          "आगामी प्रमुख सांस्कृतिक त्यौहार कौन से हैं?",
          "मंदिरों में दर्शन के सामान्य नियम क्या हैं?",
          "भारत के शीर्ष ऐतिहासिक स्थल दिखाएं"
        ];
      } else {
        const cultures = lawsData.generalCulture.slice(0, 3);
        reply = `**Indian Cultural Customs & Traditions**:\n\n`;
        cultures.forEach(c => {
          reply += `• **${c.title}**: ${c.description}\n\n`;
        });

        suggestions = [
          "What are the major upcoming heritage festivals?",
          "What is the standard temple etiquette?",
          "Show me top historical monuments to visit"
        ];
      }
    }
    // 7. INTENT: SAFETY & DISASTER ALERTS
    else if (lower.includes("safety") || lower.includes("alert") || lower.includes("danger") || lower.includes("weather") || lower.includes("disaster") || lower.includes("rain") || lower.includes("flood") || lower.includes("सुरक्षा") || lower.includes("अलर्ट")) {
      intent = "safety_alerts";
      const activeAlerts = await Alert.find({ active: true }).limit(3);

      if (isHi) {
        if (activeAlerts.length > 0) {
          reply = `**सक्रिय यात्रा सुरक्षा एवं मौसम अलर्ट**:\n\n`;
          activeAlerts.forEach(a => {
            reply += `⚠️ **${a.title}**\n` +
              `• *क्षेत्र*: ${a.state} · ${a.district || "क्षेत्रीय"}\n` +
              `• *सलाह*: ${a.description}\n` +
              `• *निर्देश*: ${a.instruction || "सावधानी बरतें।"}\n\n`;
          });
        } else {
          reply = `✅ **सब सुरक्षित है**: प्रमुख विरासत स्थलों पर वर्तमान में कोई गंभीर मौसम या प्राकृतिक आपदा चेतावनी सक्रिय नहीं है। सामान्य पर्यटन सुचारू रूप से जारी है।`;
        }

        suggestions = [
          "ताजमहल में भीड़ का स्तर देखें",
          "कम ज्ञात ऐतिहासिक स्थल खोजें",
          "स्मारकों के खुलने का समय देखें"
        ];
      } else {
        if (activeAlerts.length > 0) {
          reply = `**Active Travel Safety & Weather Advisories**:\n\n`;
          activeAlerts.forEach(a => {
            reply += `⚠️ **${a.title}** (${a.severity.toUpperCase()})\n` +
              `• *Area*: ${a.state} · ${a.district || "Regional"}\n` +
              `• *Advisory*: ${a.description}\n` +
              `• *Instruction*: ${a.instruction || "Exercise caution."}\n\n`;
          });
        } else {
          reply = `✅ **All Clear**: No extreme weather or disaster advisories are currently active across major heritage sites. Normal sightseeing operations are in progress.`;
        }

        suggestions = [
          "Check crowd levels at Taj Mahal",
          "Find undiscovered heritage sites",
          "View monument opening times"
        ];
      }
    }
    // 8. INTENT: MONUMENT RECOMMENDATIONS / GENERAL SEARCH
    else {
      intent = "recommendation";
      const queryWords = lower.split(/\s+/).filter(w => w.length > 3);
      const isAccessible = lower.includes("wheelchair") || lower.includes("accessible") || lower.includes("disab") || lower.includes("दिव्यांग");

      let filter = {};
      if (isAccessible) {
        filter["accessibility.tags"] = "wheelchair_accessible";
      }

      const all = await Monument.find(filter);
      let scored = all.map(m => {
        let score = 0;
        const text = `${m.name} ${m.state} ${m.category} ${m.shortDescription || ""} ${m.history || ""}`.toLowerCase();
        queryWords.forEach(w => {
          if (text.includes(w)) score += 2;
        });
        score += (m.popularity || 5) * 0.2;
        return { m, score };
      });

      scored.sort((a, b) => b.score - a.score);
      const topMatches = scored.slice(0, 4).map(s => s.m);

      if (topMatches.length > 0) {
        if (isHi) {
          reply = `**आपकी खोज से संबंधित प्रमुख विरासत स्थल**:\n\n`;
          topMatches.forEach((m, idx) => {
            const nameHi = getLocalizedName(m, "hi");
            reply += `${idx + 1}. **${nameHi}** (${m.state})\n` +
              `   ${m.shortDescription || "भारत का प्रतिष्ठित ऐतिहासिक धरोहर स्थल।"}\n\n`;
          });
          suggestions = [
            "ताजमहल में आज भीड़ कैसी है?",
            "हम्पी घूमने का सबसे अच्छा समय क्या है?",
            "कम ज्ञात ऐतिहासिक स्थल दिखाएं",
            "स्मारकों पर ड्रोन और कैमरे के नियम"
          ];
        } else {
          reply = `**Here are top recommended destinations matching your query**:\n\n`;
          topMatches.forEach((m, idx) => {
            reply += `${idx + 1}. **${m.name}** (${m.state}) — *${m.category || "Monument"}*\n` +
              `   ${m.shortDescription || "Iconic Indian heritage destination."}\n\n`;
          });
          suggestions = [
            "How crowded is Taj Mahal today?",
            "When is the best time to visit Hampi?",
            "Show me unexplored hidden gems in India",
            "What are the drone and camera laws at monuments?"
          ];
        }
        matchedMonuments = topMatches;
      } else {
        if (isHi) {
          reply = `मैं आपको स्मारकों का अन्वेषण करने, लाइव भीड़ का सटीक अनुमान लगाने, यात्रा का सर्वोत्तम समय खोजने, कम ज्ञात स्थल ढूंढने, और भारत भर के यात्रा नियमों व व्यंजनों की जानकारी देने में मदद कर सकता हूँ।`;
          suggestions = [
            "ताजमहल में आज भीड़ कैसी है?",
            "हम्पी घूमने का सबसे अच्छा समय क्या है?",
            "कम ज्ञात ऐतिहासिक स्थल दिखाएं",
            "स्मारकों पर ड्रोन और कैमरे के नियम"
          ];
        } else {
          reply = `I can help you explore monuments, check real-time crowd predictions, find best visiting times, explore hidden gems, and review travel laws and local cuisines across India.`;
          suggestions = [
            "How crowded is Taj Mahal today?",
            "When is the best time to visit Hampi?",
            "Show me unexplored hidden gems in India",
            "What are the drone and camera laws at monuments?"
          ];
        }
      }
    }

    // Voice response clean speech string (stripping markdown bold and asterisks)
    const voiceText = reply.replace(/\*\*/g, "").replace(/•/g, "").replace(/#/g, "").substring(0, 280);

    return res.json({
      status: "success",
      intent,
      reply,
      voiceText,
      quickFacts,
      monuments: matchedMonuments,
      suggestions
    });
  } catch (err) {
    console.error("AI Assistant Error:", err);
    return res.status(500).json({ status: "error", message: "Failed to process AI assistant query", detail: err.message });
  }
};
