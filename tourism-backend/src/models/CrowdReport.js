const mongoose = require("mongoose");
const { CROWD_LEVELS } = require("../config/constants");

// Powers report §4.4 "Ticket-linked crowd signal" + the crowdsourced "how busy is it right now" prompt.
// Google Popular Times is deliberately NOT used (unofficial, ToS-violating) — see report §2, Crowd prediction row.
const CrowdReportSchema = new mongoose.Schema(
  {
    monument: { type: mongoose.Schema.Types.ObjectId, ref: "Monument", required: true, index: true },
    source: { type: String, enum: ["user_report", "eticket_count"], required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // null for eticket_count
    level: { type: String, enum: CROWD_LEVELS, required: true },
    ticketCount: { type: Number }, // only for eticket_count source
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// Reports older than 6 hours are excluded from live estimates (TTL-like behavior handled in service layer).
module.exports = mongoose.model("CrowdReport", CrowdReportSchema);
