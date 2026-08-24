# 06. Testing & Verification Checklist

This document provides terminal test commands (cURL & PowerShell), end-to-end integration workflows, and troubleshooting tips to verify that all parts of **YatraMitra AI** are operating correctly.

---

## 1. Quick API Health Verification (PowerShell / cURL)

Run these commands in PowerShell or Terminal to verify backend status:

### 1.1 Healthcheck
```powershell
curl -X GET http://localhost:5000/healthz
```
*Expected Output*: `{"status":"ok","uptime":...}`

---

### 1.2 List Curated Monuments
```powershell
curl -X GET "http://localhost:5000/api/monuments?limit=5"
```
*Expected Output*: JSON containing `count: 5` with monument records (Hampi, Taj Mahal, Mandu Fort, etc.).

---

### 1.3 Fetch a Monument by Slug
```powershell
curl -X GET "http://localhost:5000/api/monuments/hampi-ruins?lang=hi"
```
*Expected Output*: Full JSON details of Hampi including Hindi translation if available.

---

### 1.4 Test Weather API
```powershell
curl -X GET "http://localhost:5000/api/weather?lat=15.335&lng=76.462"
```
*Expected Output*: NASA POWER climate observations for Hampi coordinates.

---

### 1.5 Test SACHET Disaster Alerts
```powershell
curl -X GET "http://localhost:5000/api/alerts"
```
*Expected Output*: Array of active NDMA safety alerts cached locally.

---

### 1.6 Test Real-Time Crowd Estimate
```powershell
curl -X GET "http://localhost:5000/api/crowd/hampi-ruins/estimate"
```
*Expected Output*: `{ "success": true, "monument": "hampi-ruins", "level": "low", "confidence": "..." }`.

---

### 1.7 User Registration & Authentication
```powershell
curl -X POST http://localhost:5000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{"name":"Tester","email":"test@example.com","password":"Password123!","preferredLanguage":"hi"}'
```
*Expected Output*: JSON with JWT `token` and sanitized user object.

---

## 2. End-to-End User Verification Scenarios

### 🌟 Scenario A: Exploring Destinations on the Map
1. Open `http://localhost:3000/standard/explore.html` in your browser.
2. Verify that the sidebar loads the 30 curated heritage sites from MongoDB.
3. Verify that the Leaflet map renders 30 location pins across India.
4. Click on the pin for **Hampi Ruins** — the popup should open displaying the state, summary, and a link to the full monument guide.

---

### 🌟 Scenario B: Checking Safety & Weather on the Monument Detail Page
1. Navigate to `http://localhost:3000/standard/monument.html?slug=hampi-ruins`.
2. Verify that the title, region, history, entrance fees, and visiting hours are populated.
3. Check the **Weather & Best Time to Visit** widget: verify that it displays temperature and seasonal recommendations.
4. Check the **Safety Alert Banner**: if any alert exists for Karnataka, verify that a red warning banner appears at the top.

---

### 🌟 Scenario C: Live Crowd Feedback
1. On the monument page, verify the **Crowd Level Indicator** badge displays `LOW`, `MODERATE`, or `HIGH`.
2. Click the quick feedback button *"I'm here now (Moderate)"*.
3. Verify that the report is submitted successfully and the confidence rating updates.

---

### 🌟 Scenario D: Screen Reader & Accessibility Mode
1. Click **"Accessible version"** in the top navigation or navigate to `http://localhost:3000/accessibility/index.html`.
2. Click the text size buttons (`A`, `A+`, `A++`) and verify that the layout scales up smoothly and persists after page refresh.
3. Verify that high-contrast color ratios and skip-links are present and keyboard-navigable (`Tab` key).

---

## 3. Common Troubleshooting & Debugging

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **`Fetch Failed / NetworkError`** | Backend server is not running on port 5000. | In `tourism-backend/`, run `npm start` or `npm run dev`. Ensure output says `API running on port 5000`. |
| **`MongoDB connection failed`** | Local MongoDB service is not started. | Start MongoDB service (`net start MongoDB` on Windows) or update `MONGO_URI` in `.env` to MongoDB Atlas. |
| **`Monuments count is 0`** | Database was not seeded with curated data. | Run `npm run seed` inside `tourism-backend/` to import all 30 monuments and festivals. |
| **`CORS Error in browser console`** | Frontend running on custom port blocked by CORS. | In `tourism-backend/.env`, set `CLIENT_URL=*` or `CLIENT_URL=http://localhost:3000`. |
| **`Leaflet map is blank / gray`** | Map container height not set or Leaflet CSS missing. | Ensure `<div id="map">` has CSS height (e.g. `height: 100vh`) and Leaflet CSS is included in `<head>`. |
| **`Audio guide fails to play`** | Bhashini API keys not configured. | The app handles this gracefully with fallback text; obtain Bhashini keys from [bhashini.gov.in](https://bhashini.gov.in) to enable live voice synthesis. |
