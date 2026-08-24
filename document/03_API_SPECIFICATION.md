# 03. Complete Backend API Specification

This document provides the exact HTTP interface specification for all endpoints available in the **YatraMitra AI** backend (`http://localhost:5000/api`).

---

## 1. Authentication Endpoints (`/api/auth`)

### 1.1 Register User
- **Method**: `POST`
- **URL**: `/api/auth/register`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "name": "Arshiya Sharma",
    "email": "arshiya@example.com",
    "password": "SecurePassword123!",
    "preferredLanguage": "hi"
  }
  ```
- **Success Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "66c5a01234567890abcdef12",
      "name": "Arshiya Sharma",
      "email": "arshiya@example.com",
      "preferredLanguage": "hi",
      "role": "user",
      "healthDataOptedIn": false
    }
  }
  ```

---

### 1.2 Login User
- **Method**: `POST`
- **URL**: `/api/auth/login`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "email": "arshiya@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "66c5a01234567890abcdef12",
      "name": "Arshiya Sharma",
      "email": "arshiya@example.com",
      "preferredLanguage": "hi",
      "role": "user",
      "healthDataOptedIn": false
    }
  }
  ```

---

### 1.3 Get Current User Profile
- **Method**: `GET`
- **URL**: `/api/auth/me`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "66c5a01234567890abcdef12",
      "name": "Arshiya Sharma",
      "email": "arshiya@example.com",
      "preferredLanguage": "hi",
      "role": "user",
      "preferences": {
        "travelStyle": "budget",
        "interests": ["historical", "architecture"]
      },
      "healthDataOptedIn": false
    }
  }
  ```

---

## 2. Monument & Heritage Endpoints (`/api/monuments`)

### 2.1 List Monuments with Filters & Pagination
- **Method**: `GET`
- **URL**: `/api/monuments`
- **Query Parameters**:
  - `state` *(optional)*: Filter by state (e.g. `Uttar Pradesh`, `Karnataka`)
  - `category` *(optional)*: `monument` | `temple` | `fort` | `museum` | `natural`
  - `underexplored` *(optional)*: `true` | `false`
  - `search` *(optional)*: Full-text search on name, description, and state
  - `page` *(optional, default 1)*: Page number
  - `limit` *(optional, default 20)*: Number of items per page
- **Example Request**: `GET /api/monuments?underexplored=true&limit=10`
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "count": 4,
    "total": 4,
    "page": 1,
    "data": [
      {
        "_id": "66c5a01234567890abcdef01",
        "name": "Hampi Ruins",
        "slug": "hampi-ruins",
        "state": "Karnataka",
        "district": "Vijayanagara",
        "category": "monument",
        "isUnderexplored": true,
        "location": {
          "type": "Point",
          "coordinates": [76.462, 15.335]
        },
        "shortDescription": "Boulder-strewn capital of the Vijayanagara empire, dotted with 14th-century temple complexes and royal pavilions.",
        "accessibility": {
          "tags": ["wheelchair_accessible", "rest_areas_available"],
          "wcagNotes": "Electric carts available inside the main complex."
        },
        "entryFee": { "indian": 40, "foreigner": 600, "currency": "INR" },
        "timings": {
          "openTime": "06:00",
          "closeTime": "18:00",
          "closedOn": [],
          "bestVisitMonths": ["November", "December", "January", "February"]
        },
        "images": ["https://upload.wikimedia.org/wikipedia/commons/thumb/hampi.jpg"]
      }
    ]
  }
  ```

---

### 2.2 Geo-spatial Nearby Monuments
- **Method**: `GET`
- **URL**: `/api/monuments/nearby`
- **Query Parameters**:
  - `lat` *(required)*: Latitude (e.g. `27.1751`)
  - `lng` *(required)*: Longitude (e.g. `78.0421`)
  - `radiusKm` *(optional, default 25)*: Search radius in kilometers
- **Example Request**: `GET /api/monuments/nearby?lat=27.1751&lng=78.0421&radiusKm=50`
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "count": 2,
    "data": [
      {
        "name": "Taj Mahal",
        "slug": "taj-mahal",
        "state": "Uttar Pradesh",
        "location": { "type": "Point", "coordinates": [78.0421, 27.1751] }
      }
    ]
  }
  ```

---

### 2.3 Get Monument Detail by Slug
- **Method**: `GET`
- **URL**: `/api/monuments/:slug`
- **Query Parameters**:
  - `lang` *(optional)*: Target language code (e.g. `hi`, `ta`, `te`, `mr`, `bn`)
- **Example Request**: `GET /api/monuments/taj-mahal?lang=hi`
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "66c5a01234567890abcdef02",
      "name": "Taj Mahal",
      "slug": "taj-mahal",
      "state": "Uttar Pradesh",
      "district": "Agra",
      "shortDescription": "17th-century white marble mausoleum built by Mughal emperor Shah Jahan.",
      "history": "Commissioned in 1632 by Mughal emperor Shah Jahan to house the tomb of his favourite wife, Mumtaz Mahal...",
      "culturalSignificance": "A masterpiece of Mughal architecture symbolizing eternal love.",
      "foodNearby": ["Petha at Panchhi Petha", "Bedai and Jalebi"],
      "lawsAndEtiquette": [
        "Shoe covers must be worn on the main mausoleum platform.",
        "Photography is strictly prohibited inside the main mausoleum chamber.",
        "Drone photography is completely banned in the Taj heritage zone."
      ],
      "accessibility": {
        "tags": ["wheelchair_accessible", "braille_signage", "step_free_access"],
        "wcagNotes": "Ramps and manual wheelchairs are available at the East Gate."
      },
      "entryFee": { "indian": 50, "foreigner": 1100, "currency": "INR" },
      "timings": {
        "openTime": "Sunrise",
        "closeTime": "Sunset",
        "closedOn": ["Friday"],
        "bestVisitMonths": ["October", "November", "December", "January", "February", "March"]
      },
      "heritageArchive": [
        {
          "title": "Local Agra Guide Oral Account",
          "narratorName": "Mohammad Aslam",
          "audioUrl": "https://cdn.example.com/audio/taj-history-hi.mp3",
          "transcript": "ताजमहल की नींव यमुना नदी के किनारे कुओं की एक श्रृंखला पर रखी गई थी...",
          "language": "hi"
        }
      ]
    },
    "translation": {
      "lang": "hi",
      "name": "ताज महल",
      "shortDescription": "मुगल सम्राट शाहजहाँ द्वारा बनवाया गया 17वीं सदी का सफेद संगमरमर का मकबरा।",
      "dosAndDonts": [
        "मुख्य मकबरे पर जूता कवर पहनना अनिवार्य है।",
        "अंदर फोटोग्राफी सख्त मना है।"
      ],
      "supportTier": "full"
    }
  }
  ```

---

### 2.4 Offline Data Package
- **Method**: `POST`
- **URL**: `/api/monuments/offline-package`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "slugs": ["hampi-ruins", "taj-mahal", "mandu-fort"]
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "generatedAt": "2026-08-21T11:45:00.000Z",
    "count": 3,
    "data": [ /* Compact array containing essential offline data */ ]
  }
  ```

---

## 3. Multilingual Translation & Voice AI (`/api/translate`)

### 3.1 List Supported Languages & Quality Tiers
- **Method**: `GET`
- **URL**: `/api/translate/languages`
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "hi": { "name": "Hindi", "tier": "full" },
      "en": { "name": "English", "tier": "full" },
      "ta": { "name": "Tamil", "tier": "full" },
      "te": { "name": "Telugu", "tier": "full" },
      "kn": { "name": "Kannada", "tier": "full" },
      "mr": { "name": "Marathi", "tier": "full" },
      "bn": { "name": "Bengali", "tier": "full" },
      "gu": { "name": "Gujarati", "tier": "full" },
      "ml": { "name": "Malayalam", "tier": "best_effort" },
      "pa": { "name": "Punjabi", "tier": "best_effort" },
      "or": { "name": "Odia", "tier": "best_effort" },
      "as": { "name": "Assamese", "tier": "best_effort" }
    }
  }
  ```

---

### 3.2 Translate Text (Bhashini NLTM)
- **Method**: `POST`
- **URL**: `/api/translate/text`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "text": "What is the entry fee for Taj Mahal?",
    "sourceLanguage": "en",
    "targetLanguage": "hi"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "translatedText": "ताजमहल का प्रवेश शुल्क क्या है?",
    "targetLanguageTier": "full"
  }
  ```

---

### 3.3 Text-to-Speech (TTS Audio Stream)
- **Method**: `POST`
- **URL**: `/api/translate/text-to-speech`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "text": "ताजमहल में आपका स्वागत है।",
    "language": "hi",
    "gender": "female"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "audioBase64": "UklGRi4AAABXQVZFZm10IBAAAAABAAEA...",
    "engine": "bhashini"
  }
  ```

---

### 3.4 Speech-to-Text (Voice Search ASR)
- **Method**: `POST`
- **URL**: `/api/translate/speech-to-text`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "audioBase64": "UklGRi4AAABXQVZFZm10IBAAAAABAAEA...",
    "language": "hi",
    "audioFormat": "wav"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "text": "हम्पी के मंदिर कहाँ हैं?"
  }
  ```

---

## 4. Live Weather & Best Time to Visit (`/api/weather`)

### 4.1 Get Weather Bundle
- **Method**: `GET`
- **URL**: `/api/weather`
- **Query Parameters**:
  - `lat` *(required)*: Latitude (e.g. `27.1751`)
  - `lng` *(required)*: Longitude (e.g. `78.0421`)
- **Example Request**: `GET /api/weather?lat=27.1751&lng=78.0421`
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "nasa": {
        "source": "NASA_POWER",
        "location": { "lat": 27.1751, "lon": 78.0421 },
        "days": [
          {
            "date": "20260820",
            "temperatureC": 31.4,
            "precipitationMm": 2.1,
            "relativeHumidityPct": 68.2,
            "windSpeedMs": 3.8
          }
        ]
      },
      "openWeather": null,
      "imd": {
        "available": false,
        "reason": "IMD API registrations are currently paused"
      }
    }
  }
  ```

---

### 4.2 Get "Best Time to Visit" Advisory
- **Method**: `POST`
- **URL**: `/api/weather/best-time`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "lat": 27.1751,
    "lng": 78.0421,
    "bestVisitMonths": ["October", "November", "December", "January", "February", "March"]
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "currentMonth": "August",
    "isSeasonallyRecommended": false,
    "recentAvgTemperatureC": 32.5,
    "recentAvgPrecipitationMm": 5.2,
    "advice": "This is off-season for this site — expect fewer crowds but check conditions."
  }
  ```

---

## 5. SACHET Disaster & Safety Alerts (`/api/alerts`)

### 5.1 Get Active Disaster Alerts
- **Method**: `GET`
- **URL**: `/api/alerts`
- **Query Parameters**:
  - `area` *(optional)*: State, district, or site keyword (e.g. `Kerala`, `Uttarakhand`, `Agra`)
  - `type` *(optional)*: `flood` | `cyclone` | `landslide` | `forest_fire` | `earthquake`
- **Example Request**: `GET /api/alerts?area=Himachal`
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "count": 1,
    "data": [
      {
        "_id": "66c5a01234567890abcdef99",
        "capIdentifier": "SACHET-2026-ALERT-08912",
        "type": "landslide",
        "headline": "Moderate Landslide Risk along Shimla-Kullu Highway",
        "description": "Due to continuous heavy rains, moderate landslide warning is issued. Commuters and tourists are advised to avoid high-gradient routes.",
        "areaDescription": "Himachal Pradesh",
        "effective": "2026-08-21T06:00:00.000Z",
        "expires": "2026-08-22T06:00:00.000Z"
      }
    ]
  }
  ```

---

## 6. Crowd Estimation & Congestion (`/api/crowd`)

### 6.1 Get Live Crowd Level Estimate
- **Method**: `GET`
- **URL**: `/api/crowd/:slug/estimate`
- **Example Request**: `GET /api/crowd/taj-mahal/estimate`
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "monument": "taj-mahal",
    "level": "high",
    "confidence": "high",
    "basis": "blended_rules_and_reports",
    "sampleSize": 8
  }
  ```
  *(Crowd levels returned: `"low"` | `"moderate"` | `"high"` | `"very_high"`)*

---

### 6.2 Submit Crowdsourced User Report
- **Method**: `POST`
- **URL**: `/api/crowd/:slug/report`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "level": "moderate"
  }
  ```
- **Success Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "66c5a01234567890abcdef77",
      "monument": "66c5a01234567890abcdef02",
      "level": "moderate",
      "source": "user_report",
      "timestamp": "2026-08-21T12:00:00.000Z"
    }
  }
  ```

---

## 7. Health & Personalization Profile (`/api/health-profile`)

*All routes require `Authorization: Bearer <JWT_TOKEN>` header.*

### 7.1 Save Encrypted Health Profile
- **Method**: `PUT`
- **URL**: `/api/health-profile`
- **Request Body**:
  ```json
  {
    "allergies": ["peanut", "gluten"],
    "conditions": ["asthma", "hypertension"],
    "mobilityNeeds": ["wheelchair_access", "step_free_ramps"],
    "notes": "Prefers shaded paths during afternoon hours."
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Health profile saved (encrypted, opt-in).",
    "optedIn": true
  }
  ```

---

### 7.2 Get Recommendation Flags (Non-diagnostic)
- **Method**: `GET`
- **URL**: `/api/health-profile/recommendation-flags`
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "flags": [
      "prefer_wheelchair_accessible_sites",
      "filter_food_recommendations_by_allergy",
      "avoid_high_heat_high_exertion_slots"
    ]
  }
  ```

---

## 8. Festivals Calendar (`/api/festivals`)

### 8.1 Get Active Festivals
- **Method**: `GET`
- **URL**: `/api/festivals/active?state=Karnataka`
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "count": 1,
    "data": [
      {
        "name": "Hampi Utsav",
        "state": "Karnataka",
        "date": "2026-11-03T00:00:00.000Z",
        "endDate": "2026-11-05T00:00:00.000Z",
        "touristImpact": "very_high",
        "description": "Three-day cultural festival celebrating the Vijayanagara empire."
      }
    ]
  }
  ```
