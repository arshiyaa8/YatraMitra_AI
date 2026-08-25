/**
 * server.js — Main Application Entry Point
 *
 * Configures the Express HTTP server, security headers, rate limiting,
 * static asset serving, REST API routing, and periodic background sync
 * (e.g. SACHET national disaster alerts).
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");

const connectDB = require("./src/config/db");
const routes = require("./src/routes");
const { notFound, errorHandler } = require("./src/middleware/errorHandler");
const sachetService = require("./src/services/sachetService");

const app = express();

// ── Security & Core Middleware ────────────────────────────────────
// Disable cross-origin resource policy restriction so static images load seamlessly
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  })
);

app.use(compression());
app.use(express.json({ limit: "5mb" })); // Supports base64 audio payloads for ASR / TTS
app.use(express.urlencoded({ extended: true }));

// Serve frontend client assets statically
app.use(express.static(path.join(__dirname, "..", "frontend")));

if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

// ── Rate Limiting ─────────────────────────────────────────────────
// Protects public endpoints from brute-force and scraping abuse
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});
app.use("/api", limiter);

// ── Infrastructure Health Check ───────────────────────────────────
app.get("/healthz", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

// ── REST API Routes ───────────────────────────────────────────────
app.use("/api", routes);

// ── Error Handling Middleware ─────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

/**
 * Initializes database connection, starts listening on designated port,
 * and schedules recurring background data sync jobs.
 */
const start = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 YatraMitra Assistant API running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
  });

  // Prime SACHET national safety alerts on startup, then refresh every 15 minutes
  sachetService
    .refreshAlerts()
    .then((r) => console.log(`SACHET alerts primed: ${r.fetched || 0} active alerts loaded`))
    .catch((e) => console.warn("Initial SACHET alert sync failed (will retry on interval):", e.message));

  // Prime SafePath verified emergency safe havens
  const safeZoneService = require("./src/services/safeZoneService");
  safeZoneService.ensureSeedSafeZones().catch((e) => console.warn("SafePath safe zone seeding skipped:", e.message));

  setInterval(() => {
    sachetService.refreshAlerts().catch((e) => console.warn("Periodic SACHET sync failed:", e.message));
  }, 15 * 60 * 1000);
};

start();

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
});

module.exports = app;
