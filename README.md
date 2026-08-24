# 🕌 YatraMitra AI

**Your AI-powered companion for exploring India's heritage.**

YatraMitra AI is a mobile-first, multilingual, location-aware tourism assistant built for India's monuments and cultural sites. It combines a conversational AI voice guide, real-time safety intelligence, and machine-learning-driven trip planning into a single Progressive Web App — helping travelers discover, understand, and safely navigate India's heritage in their own language.

Built for **Smart India Hackathon (SIH) 2026**, on top of **Bhashini** (multilingual voice/translation), **NDMA SACHET** (disaster & weather alerts), and **ISRO Bhuvan** (geospatial mapping).

---

## ✨ What It Does

YatraMitra AI isn't just a monument directory — it's a full travel companion:

| Capability | Description |
|---|---|
| 🗣️ **Multilingual AI Voice Assistant** | Talk to the app in your language. Persona-based voices and quick-reply chips make it conversational, not just a search bar. |
| 🏛️ **Monument Explorer** | Browse **31 verified heritage monuments** on an interactive Leaflet map, sorted by distance, with "hidden gem" scoring to surface lesser-known spots. |
| 🔊 **Audio Guides** | Bhashini-powered text-to-speech audio guides available in **25 languages**, plus community-contributed archives for each monument. |
| 🎉 **Cultural Festival Calendar** | Live and upcoming 2026 festival listings, organized by state. |
| ⚖️ **Laws & Etiquette** | State-wise regulations, cultural do's-and-don'ts, and emergency helpline numbers for travelers. |
| 🚨 **Safety Alerts** | Real-time disaster and meteorological warnings sourced from **NDMA SACHET**. |
| 🧭 **Smart Itinerary Planning** | A TSP (Travelling Salesman Problem)-based route optimizer plans the most efficient multi-monument trip. |
| 🔐 **Privacy-First Profiles** | User accounts store health/accessibility data with **DPDP Act-compliant encryption**. |
| 📱 **Installable PWA** | Works like a native app — installable on mobile with offline-friendly caching. |

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML, CSS, JavaScript (vanilla — no framework), Leaflet.js for maps, mobile-first responsive + PWA |
| **Backend** | Node.js, Express.js, MongoDB (Mongoose) |
| **ML / AI Service** | Python (crowd prediction, TSP route optimization, "hidden gems" scoring) |
| **External APIs** | Bhashini (translation & TTS), NDMA SACHET (alerts), ISRO Bhuvan (geospatial data) |

---

## 📁 Project Structure

```
YatraMitra_AI/
├── frontend/            # Static HTML/CSS/JS PWA — served by the backend
│   ├── index.html        # AI Voice Assistant (home)
│   ├── explore.html       # Monument explorer + map
│   ├── monument.html      # Monument detail + audio guide
│   ├── festivals.html     # Cultural festival calendars
│   ├── laws.html          # Laws & etiquette
│   ├── alerts.html        # Safety alerts (SACHET)
│   └── account.html       # User profile & itinerary planner
│
├── tourism-backend/     # Node.js + Express + MongoDB API server
│   ├── server.js         # Entry point — serves the API and the frontend
│   ├── seed.js / scripts # Database seeder (monuments, festivals, translations)
│   └── ...                # Routes, models, controllers
│
└── tourism-ml/           # Python microservice for ML-driven features
    └── ai_api.py          # Crowd prediction, TSP routing, hidden-gems scoring
```

> The backend serves both the REST API **and** the static frontend, so in normal use you only browse to the backend's URL — the frontend files aren't opened directly.

---

## ✅ Prerequisites

Make sure you have these installed before starting:

- **Node.js** (v16 or later) and **npm**
- **MongoDB** (local installation, or a connection string to a hosted instance like MongoDB Atlas)
- **Python 3.9+** and **pip**
- **Git**

---

## 🚀 Getting Started

Every step below is marked so you know what to run **every time** vs. what you only need to do **once, the first time.**

### Step 1 — Clone the repository *(first-timers only)*

```bash
git clone https://github.com/arshiyaa8/YatraMitra_AI.git
cd YatraMitra_AI
```
> Already have the repo? Just `git pull` to get the latest changes and skip to Step 2.

### Step 2 — Install dependencies *(first-timers only, or after a `git pull` that changed dependencies)*

Install the backend (Node) dependencies:
```bash
cd tourism-backend
npm install
```

Install the ML service (Python) dependencies:
```bash
cd ../tourism-ml
pip install -r requirements.txt
```
> ⏭️ **Returning contributor with no dependency changes?** Skip this step entirely — your existing `node_modules` and Python environment are still valid.

### Step 3 — Configure environment variables *(first-timers only)*

Inside `tourism-backend/`, create a `.env` file (or check for a `.env.example` to copy) with at least your MongoDB connection string, e.g.:
```
MONGO_URI=mongodb://localhost:27017/yatramitra
PORT=5000
```
Check `server.js` for the exact variable names it expects, since these can evolve as the project grows.
> ⏭️ Already configured your `.env` once? No need to redo this — it persists locally (and is git-ignored).

### Step 4 — Make sure MongoDB is running *(every time)*

If MongoDB is installed as a Windows Service, it starts automatically — you can skip this. Otherwise, start it manually:
```powershell
mongod
```

### Step 5 — Seed the database *(first-timers only — one-time setup)*

Populate MongoDB with all 31 verified monuments, the 2026 festival calendars, and Hindi translations:
```powershell
cd tourism-backend
npm run seed
```
> ⏭️ **Skip this if you've seeded before** — reseeding is only needed once per database, or if the seed data has been updated and you're told to re-run it.

### Step 6 — Start the backend server *(every time — Terminal 1)*

```powershell
cd tourism-backend
npm start
```
🌐 The backend starts on **`http://localhost:5000`** and automatically serves the frontend too — you don't need a separate frontend server.

### Step 7 — Start the Python ML service *(every time — Terminal 2)*

In a **second terminal window**:
```powershell
cd tourism-ml
python ai_api.py
```
🧠 This powers crowd prediction, the ML route/TSP optimizer, and hidden-gems scoring, and runs on **`http://localhost:5001`**.

### Step 8 — Open the app *(every time)*

Head to:
👉 **http://localhost:5000**

---

## 📱 Page-by-Page Guide

| Page | URL | What's There |
|---|---|---|
| **AI Voice Assistant** | `/index.html` | Multilingual voice interaction, persona voices, quick-reply chips |
| **Explore Monuments** | `/explore.html` | 31 monuments, Leaflet map, distance sorting, hidden gems |
| **Monument Detail** | `/monument.html` | Bhashini TTS audio guide (25 languages), community archives |
| **Cultural Festivals** | `/festivals.html` | Active & upcoming 2026 festival calendars, by state |
| **Laws & Etiquette** | `/laws.html` | State regulations, cultural etiquette, emergency helplines |
| **Safety Alerts** | `/alerts.html` | Live NDMA SACHET disaster & meteorological warnings |
| **User & Itinerary** | `/account.html` | Profile, DPDP-encrypted health data, TSP route optimizer |

*(All paths are relative to `http://localhost:5000`.)*

---

## 💡 Testing the Mobile / PWA Experience

You don't need a phone to try the installable app experience:
1. Open `http://localhost:5000` in Chrome or Edge.
2. Open DevTools (`F12`) → toggle **Device Toolbar** (`Ctrl+Shift+M`) to simulate a mobile screen.
3. Or click the **"Install App"** icon in the address bar to install it like a native app.

---

## 🧩 Known Gaps / Roadmap

Being transparent about what's still in progress:
- Some backend/law-related endpoints exist as scripts but aren't yet exposed as HTTP routes.
- There's no cross-device sync for saved destinations yet.
- A dedicated trip/itinerary routing endpoint (beyond the ML TSP service) is still on the roadmap.
- Speech-to-text and character-voice endpoints exist in the ML/backend layer but aren't fully wired into every UI control yet.

---

<p align="center">Made with ❤️ for Smart India Hackathon 2026</p>
