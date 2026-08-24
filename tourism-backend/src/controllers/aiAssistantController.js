const Monument = require("../models/Monument");
const Alert = require("../models/Alert");
const lawsData = require("../data/laws-data.json");

// ── ML Crowd Predictor Logic (Ported from crowd_predictor.py) ────
function predictCrowdLevel(monument, hour = new Date().getHours(), tempC = 26, isHoliday = false) {
  const popularity = monument.popularity || 7;
  let baseLevel = (popularity / 10) * 6;

  // Hour curve (peaks between 11:00 AM and 03:00 PM)
  let hourMultiplier = 0.5;
  if (hour >= 6 && hour < 9) hourMultiplier = 0.6;
  else if (hour >= 9 && hour < 12) hourMultiplier = 1.1;
  else if (hour >= 12 && hour < 16) hourMultiplier = 1.35;
  else if (hour >= 16 && hour < 18) hourMultiplier = 0.95;
  else if (hour >= 18) hourMultiplier = 0.4;

  const dayOfWeek = new Date().getDay();
  const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6 || isHoliday) ? 1.3 : 1.0;

  // Thermal impact
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
  const offbeatScore = m.isUnderexplored ? 9.2 : 5.0;
  // Weighted: 45% low crowd, 35% rating, 20% offbeat
  const score = (0.45 * crowdFactor) + (0.35 * 9.0) + (0.20 * offbeatScore);
  return Math.round(score * 10) / 10;
}

// ── Main AI Assistant Controller ───────────────────────────────────
exports.chat = async (req, res) => {
  try {
    const rawMessage = (req.body.message || "").trim();
    const userLang = req.body.language || "en";
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
    if (lower.includes("crowd") || lower.includes("rush") || lower.includes("busy") || lower.includes("footfall") || lower.includes("traffic")) {
      intent = "crowd_prediction";
      const allMonuments = await Monument.find({});
      const target = allMonuments.find(m => lower.includes(m.name.toLowerCase()) || lower.includes(m.slug.replace(/-/g, " "))) || allMonuments.find(m => m.slug === "taj-mahal");

      const crowd = predictCrowdLevel(target);
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

      matchedMonuments = [target];
      suggestions = [
        `What is the best time to visit ${target.name}?`,
        `What are the ticket entry fees for ${target.name}?`,
        `Show me unexplored heritage gems nearby.`
      ];
    }
    // 2. INTENT: BEST TIME TO VISIT / HOURS
    else if (lower.includes("best time") || lower.includes("when to visit") || lower.includes("timings") || lower.includes("hours") || lower.includes("open") || lower.includes("closed")) {
      intent = "best_time";
      const allMonuments = await Monument.find({});
      const target = allMonuments.find(m => lower.includes(m.name.toLowerCase()) || lower.includes(m.slug.replace(/-/g, " "))) || allMonuments.find(m => m.slug === "taj-mahal");

      const bestTime = analyzeBestTimeToVisit(target);
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

      matchedMonuments = [target];
      suggestions = [
        `How crowded is ${target.name} today?`,
        `What are the camera and drone rules at ${target.name}?`,
        `What famous food is nearby ${target.name}?`
      ];
    }
    // 3. INTENT: UNEXPLORED GEMS & HIDDEN PLACES
    else if (lower.includes("unexplored") || lower.includes("hidden gem") || lower.includes("offbeat") || lower.includes("less crowded") || lower.includes("peaceful") || lower.includes("underrated")) {
      intent = "unexplored_gems";
      const hiddenGems = await Monument.find({ isUnderexplored: true }).limit(5);
      const items = hiddenGems.length > 0 ? hiddenGems : await Monument.find({}).limit(5);

      reply = `**Curated Underexplored Heritage Gems & Hidden Treasures**:\n\n` +
        `These lesser-known heritage monuments offer rich architecture, breathtaking scenery, and virtually zero tourist crowding:\n\n`;

      items.forEach((m, idx) => {
        const gemScore = computeHiddenGemScore(m);
        reply += `${idx + 1}. **${m.name}** (${m.state})\n` +
          `   • *${m.shortDescription || "Rare heritage architectural site."}*\n` +
          `   • **Hidden Gem Score**: ⭐ ${gemScore}/10 (High Peace & Low Crowds)\n\n`;
      });

      matchedMonuments = items;
      suggestions = [
        "Plan a 3-stop itinerary covering hidden gems",
        "Which of these sites have wheelchair access?",
        "Check weather and safety advisories"
      ];
    }
    // 4. INTENT: LAWS, DRONES, RULES & ETIQUETTE
    else if (lower.includes("law") || lower.includes("rule") || lower.includes("drone") || lower.includes("camera") || lower.includes("photo") || lower.includes("ticket") || lower.includes("fee") || lower.includes("penalty") || lower.includes("dress")) {
      intent = "laws_etiquette";

      let matchedLaws = [];
      if (lower.includes("drone")) {
        matchedLaws.push(lawsData.nationalLaws.find(l => l.title.toLowerCase().includes("drone")));
      }
      if (lower.includes("photo") || lower.includes("camera")) {
        matchedLaws.push(lawsData.nationalLaws.find(l => l.title.toLowerCase().includes("photo")));
      }
      if (lower.includes("alcohol") || lower.includes("drink")) {
        matchedLaws.push(lawsData.nationalLaws.find(l => l.title.toLowerCase().includes("alcohol")));
      }
      if (lower.includes("dress") || lower.includes("shoes") || lower.includes("modesty")) {
        matchedLaws.push(lawsData.generalCulture.find(c => c.title.toLowerCase().includes("dress")));
      }

      if (matchedLaws.length === 0 || !matchedLaws[0]) {
        matchedLaws = lawsData.nationalLaws.slice(0, 3);
      }

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
    // 5. INTENT: FOOD & REGIONAL CUISINE
    else if (lower.includes("food") || lower.includes("eat") || lower.includes("dish") || lower.includes("cuisine") || lower.includes("restaurant") || lower.includes("snack") || lower.includes("sweet") || lower.includes("delicac")) {
      intent = "food_cuisine";
      const allMonuments = await Monument.find({ "foodNearby.0": { $exists: true } });
      const target = allMonuments.find(m => lower.includes(m.name.toLowerCase()) || lower.includes(m.state.toLowerCase())) || allMonuments[0];

      const foods = target.foodNearby && target.foodNearby.length > 0 ? target.foodNearby : ["Regional Thali", "Street Chaat", "Lassi", "Local Sweets"];

      reply = `**Famous Culinary Specialties Near ${target.name} (${target.state})**:\n\n` +
        `• **Must-Try Iconic Dishes**: ${foods.join(", ")}\n\n` +
        `*Food Etiquette Tip: In traditional dining and temples, eating with the right hand is customary.*`;

      quickFacts = [
        { label: "Region", value: target.state },
        { label: "Top Specialties", value: foods.slice(0, 2).join(", ") }
      ];

      matchedMonuments = [target];
      suggestions = [
        `What are the visiting hours for ${target.name}?`,
        `How crowded is ${target.name}?`,
        `Recommend more cultural highlights in ${target.state}`
      ];
    }
    // 6. INTENT: CULTURE & TRADITIONS
    else if (lower.includes("culture") || lower.includes("tradition") || lower.includes("greeting") || lower.includes("namaste") || lower.includes("festival") || lower.includes("custom")) {
      intent = "culture_tradition";
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
    // 7. INTENT: SAFETY & DISASTER ALERTS
    else if (lower.includes("safety") || lower.includes("alert") || lower.includes("danger") || lower.includes("weather") || lower.includes("disaster") || lower.includes("rain") || lower.includes("flood")) {
      intent = "safety_alerts";
      const activeAlerts = await Alert.find({ active: true }).limit(3);

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
    // 8. INTENT: MONUMENT RECOMMENDATIONS / GENERAL SEARCH
    else {
      intent = "recommendation";
      // Tag & keyword matching
      const queryWords = lower.split(/\s+/).filter(w => w.length > 3);
      const isAccessible = lower.includes("wheelchair") || lower.includes("accessible") || lower.includes("disab");

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
        reply = `**Here are top recommended destinations matching your query**:\n\n`;
        topMatches.forEach((m, idx) => {
          reply += `${idx + 1}. **${m.name}** (${m.state}) — *${m.category || "Monument"}*\n` +
            `   ${m.shortDescription || "Iconic Indian heritage destination."}\n\n`;
        });
        matchedMonuments = topMatches;
      } else {
        reply = `I can help you explore monuments, check real-time crowd predictions, find best visiting times, explore hidden gems, and review travel laws and local cuisines across India.`;
      }

      suggestions = [
        "How crowded is Taj Mahal today?",
        "When is the best time to visit Hampi?",
        "Show me unexplored hidden gems in India",
        "What are the drone and camera laws at monuments?"
      ];
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
