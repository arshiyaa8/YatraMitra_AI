const axios = require("axios");
const NodeCache = require("node-cache");

// Report §2 (Weather data) + §3 problem 3: IMD's public API gateway has paused new registrations
// as of mid-2026, so it CANNOT be a hard dependency. NASA/NOAA (via NASA POWER, no key required)
// is the baseline. An IMD adapter is included but gated behind IMD_ENABLED so it can be flipped on
// the moment registrations reopen, without touching calling code.

const cache = new NodeCache({ stdTTL: 60 * 30 }); // 30 min cache — weather doesn't need to be per-request-fresh

async function getNasaPowerForecast({ lat, lon }) {
  const key = `nasa:${lat}:${lon}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const today = new Date();
  const end = today.toISOString().slice(0, 10).replace(/-/g, "");
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 3);
  const start = startDate.toISOString().slice(0, 10).replace(/-/g, "");

  const params = {
    parameters: "T2M,PRECTOTCORR,RH2M,WS2M",
    community: "RE",
    longitude: lon,
    latitude: lat,
    start,
    end,
    format: "JSON",
  };

  const { data } = await axios.get(process.env.NASA_POWER_BASE_URL, { params, timeout: 10000 });

  const daily = data?.properties?.parameter;
  const dates = daily ? Object.keys(daily.T2M || {}) : [];
  const result = {
    source: "NASA_POWER",
    location: { lat, lon },
    days: dates.map((d) => ({
      date: d,
      temperatureC: daily.T2M[d],
      precipitationMm: daily.PRECTOTCORR[d],
      relativeHumidityPct: daily.RH2M[d],
      windSpeedMs: daily.WS2M[d],
    })),
  };

  cache.set(key, result);
  return result;
}

/**
 * OpenWeatherMap fallback for near-term (hourly-ish) forecasts — free tier, optional.
 * Used when a more "current conditions" style forecast is wanted than NASA POWER's climatology-style data.
 */
async function getOpenWeatherForecast({ lat, lon }) {
  if (!process.env.OPENWEATHER_API_KEY) return null;
  const key = `owm:${lat}:${lon}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const { data } = await axios.get("https://api.openweathermap.org/data/2.5/forecast", {
    params: { lat, lon, appid: process.env.OPENWEATHER_API_KEY, units: "metric" },
    timeout: 10000,
  });

  const result = {
    source: "OPENWEATHERMAP",
    location: { lat, lon },
    forecast: (data.list || []).slice(0, 8).map((f) => ({
      time: f.dt_txt,
      temperatureC: f.main?.temp,
      condition: f.weather?.[0]?.main,
      description: f.weather?.[0]?.description,
      windSpeedMs: f.wind?.speed,
      rainProbability: f.pop,
    })),
  };
  cache.set(key, result);
  return result;
}

/**
 * IMD adapter — disabled (IMD_ENABLED=false) until IMD reopens API registrations (report §3, problem 3).
 * Wired up now so switching it on is a one-line env change, not a code change.
 */
async function getImdForecast({ lat, lon }) {
  if (process.env.IMD_ENABLED !== "true") {
    return { available: false, reason: "IMD API registrations are currently paused (see project report §2)." };
  }
  if (!process.env.IMD_API_KEY) {
    return { available: false, reason: "IMD_API_KEY not configured." };
  }
  const { data } = await axios.get(`${process.env.IMD_API_BASE_URL}/forecast`, {
    params: { lat, lon },
    headers: { Authorization: `Bearer ${process.env.IMD_API_KEY}` },
    timeout: 10000,
  });
  return { available: true, source: "IMD", data };
}

/**
 * Combined weather response: NASA POWER as guaranteed baseline, OpenWeather as an enrichment if configured,
 * IMD included only if/when enabled. This mirrors the roadmap's "adapter layer" recommendation.
 */
async function getWeatherBundle({ lat, lon }) {
  const [nasa, openWeather, imd] = await Promise.all([
    getNasaPowerForecast({ lat, lon }).catch((e) => ({ error: e.message })),
    getOpenWeatherForecast({ lat, lon }).catch((e) => ({ error: e.message })),
    getImdForecast({ lat, lon }).catch((e) => ({ error: e.message })),
  ]);
  return { nasa, openWeather, imd };
}

module.exports = { getNasaPowerForecast, getOpenWeatherForecast, getImdForecast, getWeatherBundle };
