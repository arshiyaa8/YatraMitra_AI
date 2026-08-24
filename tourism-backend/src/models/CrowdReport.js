/**
 * CrowdReport.js — Live Footfall & Ticket Gate Observation Schema
 *
 * Stores realtime crowdsourced reports and automated ticketing turnstile counts
 * used to dynamically calibrate machine learning crowd estimates.
 */

const mongoose = require("mongoose");
const { CROWD_LEVELS } = require("../config/constants");

const CrowdReportSchema = new mongoose.Schema(
  {
    monument: { type: mongoose.Schema.Types.ObjectId, ref: "Monument", required: true, index: true },
    source: { type: String, enum: ["user_report", "eticket_count"], required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Populated for verified user reports
    level: { type: String, enum: CROWD_LEVELS, required: true },
    ticketCount: { type: Number }, // Populated when source is eticket_count
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CrowdReport", CrowdReportSchema);
