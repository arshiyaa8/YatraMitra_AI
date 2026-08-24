# 01. System Architecture and Data Flow

This document provides the foundational blueprint of **YatraMitra AI (Vistaara)**. It outlines how the client-side user interfaces, the Node.js/Express backend server, the MongoDB database, external government/weather APIs, and Python machine learning services communicate with each other.

---

## 1. High-Level Architecture Diagram

```mermaid
flowchart TB
    subgraph Client ["Client Layer (Frontend)"]
        UI_Choice["Landing Page (index.html)"]
        UI_Std["Standard Experience (/standard)
        - Interactive Leaflet Map
        - Destination Cards
        - Monument Details & Q&A"]
        UI_Acc["Accessible Experience (/accessibility)
        - High-Contrast Layout
        - Screen-Reader Optimized
        - Text Size Adjuster"]
        Shared_JS["Shared Client Engine (/shared/js)
        - api.js (API Client & Auth Token)
        - monument-data.js (Data Fetcher)"]
    end

    subgraph Backend ["Application Layer (tourism-backend :5000)"]
        Server["Express.js Core (server.js)"]
        
        subgraph Middlewares ["Middlewares"]
            AuthMid["JWT Auth & Roles (auth.js)"]
            RateLimit["Rate Limiter & Helmet"]
            ErrHandler["Global Error Handler"]
        end

        subgraph Routes ["API Endpoints (/api)"]
            R_Auth["/auth - Register, Login, Profile"]
            R_Mon["/monuments - Search, Geo-spatial Nearby, Details"]
            R_Trans["/translate - Bhashini Text/Voice & TTS"]
            R_Weath["/weather - NASA POWER & Best Time"]
            R_Alert["/alerts - SACHET Disaster Alerts"]
            R_Crowd["/crowd - Real-time & Rules-based Density"]
            R_Health["/health-profile - Encrypted Opt-in Care"]
            R_Fest["/festivals - Live & Upcoming Festivals"]
        end

        subgraph Services ["Core Services"]
            S_Bhashini["bhashiniService.js (NLTM Pipeline)"]
            S_Sachet["sachetService.js (NDMA CAP RSS)"]
            S_Weather["weatherService.js (NASA + OpenWeather)"]
            S_Crowd["crowdService.js (Blended Algorithms)"]
            S_Fest["festivalService.js (2026 Calendar)"]
        end
    end

    subgraph Database ["Data Layer (MongoDB)"]
        M_Monuments[(Monuments Collection)]
        M_Users[(Users Collection + Encrypted Health)]
        M_Alerts[(Disaster Alerts Cache)]
        M_Crowd[(Crowd Reports)]
        M_Festivals[(Festivals 2026)]
    end

    subgraph External ["External Services & Government APIs"]
        Ext_Bhashini["Bhashini (MeitY NLTM API)
        22 Indian Languages TTS / ASR"]
        Ext_Sachet["SACHET (NDMA CAP Feed)
        Real-time Disaster Alerts"]
        Ext_NASA["NASA POWER / OpenWeather
        Solar & Climatological Forecasts"]
        Ext_Bhuvan["ISRO Bhuvan & Wikidata
        Heritage Geodata Layers"]
    end

    subgraph ML_Services ["ML & Analytics Layer (tourism-ml :5001)"]
        Py_Unexplored["unexplored_api.py (Flask API)"]
        Py_Crowd["crowd_predictor.py (CV & Multi-factor)"]
        Py_Route["route_maker.py (Nearest-Neighbor Itinerary)"]
        Py_Sarvam["translate.py (Sarvam AI Fallback)"]
    end

    %% Connections
    UI_Choice --> UI_Std
    UI_Choice --> UI_Acc
    UI_Std & UI_Acc --> Shared_JS
    Shared_JS -- "HTTP / JSON (REST)" --> Server
    Server --> Middlewares --> Routes
    Routes --> Services
    Services --> Database
    
    %% Service to External
    S_Bhashini <--> Ext_Bhashini
    S_Sachet <--> Ext_Sachet
    S_Weather <--> Ext_NASA
    Routes -.-> ML_Services
```

---

## 2. Architectural Layers Breakdown

### Layer 1: Presentation Layer (`frontend/`)
The frontend is designed with a **universal accessibility-first** model:
- **Landing Selector (`/index.html`)**: Allows the user to choose between the **Standard Visual Experience** and the **Accessible High-Contrast Experience**.
- **Standard UI (`/standard/`)**:
  - `index.html`: Hero banner, feature overview, underexplored destinations showcase.
  - `explore.html`: Two-pane layout with responsive sidebar list and full-screen **Leaflet.js** map showing monument pins.
  - `monument.html`: Monument deep dive with history, visiting hours, entry fees, audio narration trigger, and dynamic Q&A assistant.
- **Accessible UI (`/accessibility/`)**:
  - Semantic HTML5, high-contrast palette, dynamic font resizing (`100%`, `112%`, `128%` via `localStorage`), screen-reader focus handling, and step-free layout.
- **Shared Data Access (`/shared/js/`)**:
  - `api.js`: Centralized REST API client (Fetch wrapper with base URL, token injection, and error formatting).
  - `monument-data.js`: Helper functions providing data to both visual modes.

---

### Layer 2: API Gateway & Business Logic (`tourism-backend/`)
Built with **Node.js, Express, and Mongoose**:
- **Security & Reliability**: `helmet` (header protection), `cors` (origin whitelist), `express-rate-limit` (anti-abuse throttling), `compression` (gzip payloads).
- **Authentication & Authorization**: Stateless JWT token authentication (`auth.js`), role-based access (`admin`, `data_curator`, `user`), and AES-256 encrypted fields for sensitive personal health preferences.
- **Background Cron / Polling**:
  - Every 15 minutes, `sachetService.refreshAlerts()` polls India's NDMA SACHET CAP RSS feed, parsing disaster alerts and caching them into MongoDB for sub-10ms response times to client queries.

---

### Layer 3: Database Storage (`MongoDB`)
- **`Monument`**: Curated merged dataset (ASI, Bhuvan, Wikidata, Indian Culture Portal) with 2dsphere geo-indexing, multi-language translations (`hi`, `ta`, `te`, `bn`, etc.), accessibility tags, entry fees, and oral heritage audio archives.
- **`User`**: User credentials (bcrypt hashed passwords), language preference, and AES-encrypted opt-in health/mobility profile.
- **`Alert`**: Active disaster alerts (cyclone, flood, landslide, forest fire) with expiration TTL.
- **`CrowdReport`**: User crowd submissions and e-ticketing counts blended together for real-time congestion scores.
- **`Festival`**: Curated 2026 Indian festival calendar powering seasonal crowd surge multipliers.

---

### Layer 4: AI & ML Subsystems (`tourism-ml/`)
Python modules providing standalone AI logic or microservices:
1. **Underexplored API (`unexplored_api.py`)**: Flask microservice on port 5001 exposing `/api/unexplored` for promoting offbeat cultural gems.
2. **Multi-Factor Crowd Predictor (`crowd_predictor.py`)**: Predicts crowd density (1-10 scale) using day-of-week, hour-of-day, holiday status, weather conditions, and image feature heuristics.
3. **Route Optimizer (`route_maker.py`)**: Solves the Travelling Salesperson Problem (TSP) using a Nearest-Neighbor Haversine distance heuristic to generate optimized multi-monument itineraries.
4. **Sarvam AI Translator (`translate.py`)**: Multilingual translation for 10 Indian and 10 foreign languages.

---

## 3. End-to-End Request Data Flows

### A. Monument Discovery Flow
```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Frontend (explore.html)
    participant API as Backend (/api/monuments)
    participant DB as MongoDB (Monuments)

    User->>UI: Opens Explore page
    UI->>API: GET /api/monuments?page=1&limit=20
    API->>DB: Monument.find({}).skip(0).limit(20)
    DB-->>API: 20 Monument documents
    API-->>UI: JSON { success: true, count: 20, data: [...] }
    UI->>UI: Render sidebar cards & Leaflet map markers
    User->>UI: Clicks "Taj Mahal" marker
    UI->>UI: Navigate to monument.html?slug=taj-mahal
```

---

### B. Live Monument Details & Multilingual Voice Flow
```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Frontend (monument.html)
    participant API as Backend (/api)
    participant DB as MongoDB
    participant Bhashini as Bhashini AI

    UI->>API: GET /api/monuments/taj-mahal?lang=hi
    API->>DB: Find by slug + populated heritageArchive
    DB-->>API: Full Monument doc + Hindi translation
    API-->>UI: Monument JSON details
    UI->>UI: Render details, timings, accessibility tags

    User->>UI: Clicks "Listen in Hindi" (Audio Guide)
    UI->>API: POST /api/translate/text-to-speech { text: "...", language: "hi" }
    API->>Bhashini: Pipeline config + Inference TTS request
    Bhashini-->>API: Base64 WAV Audio
    API-->>UI: JSON { audioBase64: "...", engine: "bhashini" }
    UI->>UI: Play audio stream in browser HTML5 Audio player
```

---

### C. Safety & Disaster Alert Flow
```mermaid
sequenceDiagram
    autonumber
    participant SACHET as NDMA SACHET RSS Feed
    participant Backend as Backend Scheduler (sachetService)
    participant DB as MongoDB (Alerts)
    participant UI as Frontend (explore.html / monument.html)

    loop Every 15 Minutes
        Backend->>SACHET: GET /CapFeed (XML)
        SACHET-->>Backend: CAP XML Alert stream
        Backend->>Backend: Parse XML & classify type (flood/landslide/cyclone)
        Backend->>DB: Upsert into Alerts collection (24h TTL)
    end

    UI->>Backend: GET /api/alerts?area=Uttar+Pradesh
    Backend->>DB: Find active alerts matching regex
    DB-->>Backend: Matching safety alerts
    Backend-->>UI: JSON { success: true, data: [Alerts] }
    UI->>UI: Display warning banner if active disaster in region
```
