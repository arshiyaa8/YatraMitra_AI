# 02. Environment Setup & Execution Guide

This document contains everything needed to set up, configure, seed, and run the complete **YatraMitra AI** ecosystem (Backend, Database, Frontend, and ML Services).

---

## 1. Prerequisites

Ensure the following tools are installed on your machine:
- **Node.js**: `v18.0.0` or higher ([Download Node.js](https://nodejs.org/))
- **MongoDB**: Either a local MongoDB Community Server running on `mongodb://127.0.0.1:27017` ([Download Community Server](https://www.mongodb.com/try/download/community)) or a free [MongoDB Atlas](https://www.mongodb.com/atlas) Cloud Cluster.
- **Python**: `v3.10` or higher (for the ML & AI scripts).
- **Web Browser**: Chrome, Edge, Firefox, or Safari.
- **Static Web Server** (or VS Code Live Server extension) for serving frontend HTML files.

---

## 2. Backend Configuration (`tourism-backend/.env`)

Create a `.env` file inside the `tourism-backend/` folder:

```env
# ── Server Config ──────────────────────────────────────────
PORT=5000
NODE_ENV=development
CLIENT_URL=*

# ── Database ───────────────────────────────────────────────
# For local MongoDB:
MONGO_URI=mongodb://127.0.0.1:27017/tourism_assistant
# For MongoDB Atlas (replace <username>, <password>, <cluster>):
# MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/tourism_assistant?retryWrites=true&w=majority

# ── Security & Authentication ──────────────────────────────
JWT_SECRET=yatramitra_super_secret_jwt_key_2026_sih
JWT_EXPIRES_IN=7d
HEALTH_DATA_SECRET=yatramitra_health_profile_encryption_key_32chars!

# ── Rate Limiting ──────────────────────────────────────────
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300

# ── External Government & Weather APIs ─────────────────────
# SACHET NDMA CAP RSS Feed (Disaster Alerts)
SACHET_CAP_RSS_URL=https://sachet.ndma.gov.in/CapFeed

# NASA POWER API Base URL (free, no key required)
NASA_POWER_BASE_URL=https://power.larc.nasa.gov/api/temporal/daily/point

# OpenWeatherMap API (optional, for hourly weather enrichment)
OPENWEATHER_API_KEY=

# IMD API Adapter (disabled by default until IMD portal reopens registrations)
IMD_ENABLED=false
IMD_API_BASE_URL=https://api.imd.gov.in
IMD_API_KEY=

# ── Bhashini NLTM Translation & Voice AI ───────────────────
# Obtain from https://bhashini.gov.in / ULCA
BHASHINI_USER_ID=
BHASHINI_ULCA_API_KEY=
BHASHINI_INFERENCE_API_KEY=
BHASHINI_PIPELINE_ID=

# ── Fallback Azure TTS (Optional for Character Voices) ───────
AZURE_TTS_KEY=
AZURE_TTS_REGION=eastus
```

> [!NOTE]
> The backend is built to run smoothly even without third-party API keys. Weather defaults to NASA POWER (free, keyless), SACHET uses the public RSS CAP feed, and Monument/Festival datasets run locally off MongoDB.

---

## 3. Step-by-Step Backend Setup

### Step 1: Install Backend Dependencies
Open your terminal (PowerShell or Command Prompt) and navigate to the backend directory:
```powershell
cd d:\SIH\YatraMitra_AI\tourism-backend
npm install
```

### Step 2: Seed the Database with Curated Monuments & Festivals
Make sure your MongoDB server is running. Then run the seed script:
```powershell
npm run seed
```
**What this script does:**
1. Connects to MongoDB (`tourism_assistant` database).
2. Imports 30 verified Indian heritage monuments (`src/data/monuments-seed.json`) with geospatial coordinates, historical data, entry fees, and dos-and-don'ts.
3. Imports the full 2026 Indian festival calendar (`src/data/festivals-2026.json`) for intelligent seasonal crowd predictions.
4. Creates a default administrator account:
   - **Email**: `admin@tourismassistant.gov.in`
   - **Password**: `ChangeMe123!`

### Step 3: Start the Backend Server
```powershell
# Development mode (with live reload via nodemon):
npm run dev

# Or standard production mode:
npm start
```
You should see:
```text
✅ MongoDB connected: 127.0.0.1:27017/tourism_assistant
🚀 Tourism Assistant API running on port 5000 [development]
SACHET alerts primed: 12 fetched
```

To verify the backend is active, open your browser and navigate to:
[http://localhost:5000/api](http://localhost:5000/api) or [http://localhost:5000/healthz](http://localhost:5000/healthz).

---

## 4. Setting up Python ML Microservices (`tourism-ml/`)

The Python subsystem provides standalone scripts and an HTTP API for underexplored destinations.

### Step 1: Create and Activate a Python Virtual Environment
```powershell
cd d:\SIH\YatraMitra_AI\tourism-ml
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### Step 2: Install Python Packages
```powershell
pip install flask requests sarvamai
```

### Step 3: Start the Underexplored Destinations Microservice (Port 5001)
```powershell
python unexplored_api.py
```
This runs a microservice on [http://localhost:5001/api/unexplored](http://localhost:5001/api/unexplored).

---

## 5. Serving the Frontend (`frontend/`)

Because the frontend uses modern JavaScript `fetch()` calls and relative paths, it should be served over HTTP rather than opened as a `file:///` URI (to prevent browser CORS and origin restrictions on JSON files).

### Option A: Using VS Code / IDE Live Server (Recommended)
1. Open the project in VS Code or your IDE.
2. Right-click on `frontend/index.html`.
3. Select **"Open with Live Server"**.

### Option B: Using Node's `serve` or `http-server`
```powershell
npx serve d:\SIH\YatraMitra_AI\frontend -p 3000
```
Then visit: [http://localhost:3000](http://localhost:3000)

### Option C: Using Python built-in HTTP Server
```powershell
cd d:\SIH\YatraMitra_AI\frontend
python -m http.server 3000
```
Then visit: [http://localhost:3000](http://localhost:3000)

---

## 6. Ports & Architecture Summary

| Service | Protocol / Port | Endpoint Root | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | HTTP :3000 | `/index.html` | Visual & Accessible Travel Companion |
| **Express Backend** | HTTP :5000 | `http://localhost:5000/api` | Core REST API Gateway & Data Provider |
| **MongoDB** | TCP :27017 | `mongodb://127.0.0.1:27017` | Persistent Database |
| **Python ML API** | HTTP :5001 | `http://localhost:5001/api` | ML Analytics & Underexplored Ranker |
