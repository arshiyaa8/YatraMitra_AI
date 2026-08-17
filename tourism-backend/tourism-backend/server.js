require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

const connectDB = require("./src/config/db");
const routes = require("./src/routes");
const { notFound, errorHandler } = require("./src/middleware/errorHandler");
const sachetService = require("./src/services/sachetService");

const app = express();

// ── Core middleware ──────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: "5mb" })); // generous limit for base64 audio payloads (ASR/TTS)
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

// ── Rate limiting ─────────────────────────────────────────
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});
app.use("/api", limiter);

// ── Health check (infra, not user health data) ───────────
app.get("/healthz", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

// ── API routes ────────────────────────────────────────────
app.use("/api", routes);

// ── 404 + error handling ──────────────────────────────────
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 Tourism Assistant API running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
  });

  // Refresh SACHET alerts on boot, then every 15 minutes — keeps safety alerts fresh without
  // hitting the government feed on every single user request (report §4.2).
  sachetService
    .refreshAlerts()
    .then((r) => console.log(`SACHET alerts primed: ${r.fetched || 0} fetched`))
    .catch((e) => console.warn("Initial SACHET refresh failed (will retry on interval):", e.message));

  setInterval(() => {
    sachetService.refreshAlerts().catch((e) => console.warn("SACHET refresh failed:", e.message));
  }, 15 * 60 * 1000);
};

start();

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

module.exports = app;
