# Integration notes

This frontend was rebuilt from scratch against the **existing** `tourism-backend`
(Node/Express/MongoDB) and the **existing** `tourism-ml` Python service, without
changing either. Everything below is checked against the actual route files,
controllers, and models in the repo — not assumed.

## Every backend endpoint this frontend now calls

| Endpoint | Used on |
|---|---|
| `GET /api/monuments` (search/state/category/underexplored/page/limit) | explore.html |
| `GET /api/monuments/nearby` | explore.html ("Near me") |
| `GET /api/monuments/:slug` | monument.html |
| `POST /api/monuments/offline-package` | monument.html ("Download offline pack") |
| `POST /api/monuments/:slug/heritage-archive` | monument.html (community stories) |
| `GET /api/translate/languages` | monument.html, account.html |
| `POST /api/translate/text` (indirectly, via `?lang=` on monument fetch) | monument.html |
| `POST /api/translate/text-to-speech` | monument.html ("Listen") |
| `POST /api/translate/feedback` | monument.html ("Report a translation issue") |
| `GET /api/weather/best-time` | monument.html |
| `GET /api/alerts` | every page (banner) + alerts.html (full filterable list) |
| `GET /api/crowd/:slug/estimate` | monument.html |
| `POST /api/crowd/:slug/report` | monument.html |
| `GET /api/festivals/active`, `GET /api/festivals/upcoming` | every page (banner) + festivals.html (new) |
| `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` | account.html |
| `PATCH /api/auth/me` | account.html (new — name, language, interests, accessibility needs) |
| `GET/PUT/DELETE /api/health-profile`, `GET /api/health-profile/recommendation-flags` | account.html (new — opt-in accessibility/health profile) |

The old frontend already wired up most of this well. What's **new** in this
rebuild: nearby search, category filter, underexplored-only filter,
text-to-speech playback, translation feedback, heritage archive (view +
contribute), offline pack download, the profile/interests/accessibility form,
the opt-in health profile, recommendation flags, a dedicated festivals page,
and a dedicated full alerts page (previously only a one-line banner).

## The crowd "AI model" — already connected, now made visible

`tourism-backend/src/services/crowdService.js` already calls the Python model
at `POST /predict/crowd` (served by `tourism-ml/ai_api.py`, which wraps
`crowd_predictor.py`), falling back to a rules/reports blend if that service is
down. The old frontend only showed the resulting `level` and `confidence` —
it never showed *which* path answered. This rebuild adds a line under the
crowd level that says whether it came from the AI model or a fallback, so the
AI feature is now actually visible to a user, not just present in the API
response.

**To make this live**, the Python service has to actually be running
alongside the Node backend:

```
cd tourism-ml
pip install flask
python ai_api.py          # serves on :5001
```

`crowdService.js` already points at `http://127.0.0.1:5001` by default (or
`ML_API_URL` from env). No frontend change needed either way — it just shows
whichever basis the backend reports.

## Features the frontend deliberately does NOT claim, because the backend/model don't support them yet

I didn't remove anything that already worked, and I didn't invent endpoints
to make a feature "look" done. These are gaps in the backend/model layer,
not the frontend — flagging them rather than quietly working around them:

1. **Laws & etiquette content (national/statewise).** `tourism-ml/laws.py` is a
   Python console script with no HTTP route — nothing in Node exposes it and
   nothing in the ML API wraps it (only crowd prediction is wrapped, in
   `ai_api.py`). `laws.html` stays an honest placeholder, same as before.
   Per-monument etiquette (`lawsAndEtiquette` on the Monument model) *is* live
   data and already renders on every monument page.

2. **Saving/syncing destinations across devices.** The `User` model has a
   `savedDestinations` field, but no route reads or writes it — `PATCH
   /api/auth/me` only accepts `name`, `preferredLanguage`, and `preferences`.
   I added a **local-only** "My trip" list (browser `localStorage`) as the
   closest honest equivalent, clearly labelled as device-only in the UI. A
   real cross-device save needs a new backend route (e.g.
   `POST/DELETE /api/auth/me/saved-destinations/:slug`).

3. **Trip / itinerary planning and real routing.** There's no
   `POST /api/trips/plan` or any routing endpoint in the backend.
   `tourism-ml/route_maker.py` exists but is neither exposed via HTTP nor
   called by Node. The "My trip" list is a flat set of monuments to visit,
   not a routed, time-boxed itinerary — I didn't build an itinerary UI
   because there's no backend logic behind it to call.

4. **Voice input (speech-to-text) as a UI feature.** `POST
   /api/translate/speech-to-text` exists and is in `api.js`, but I didn't
   wire it into a UI control. Bhashini ASR needs microphone capture and a
   codec/format that matches what `bhashiniService.js` sends upstream
   (`audioFormat`, 16kHz), and testing that against a live Bhashini key was
   out of scope for a static frontend change — I'd rather leave it
   unconnected than ship a mic button that silently fails. The function is
   ready in `api.js` whenever you want to add it.

5. **"Character voice" premium narration.** `POST
   /api/translate/character-voice` exists (Azure-backed, opt-in) and is in
   `api.js`, but it requires `AZURE_TTS_KEY`/`AZURE_TTS_REGION` to be
   configured server-side, and the standard "Listen" button already covers
   the core narration need. Left unwired in the UI for the same reason as #4
   — happy to add a button once you confirm Azure is configured.

6. **Admin/data-curator actions** (creating/editing/deleting monuments,
   submitting e-ticket counts, refreshing alerts manually) are real routes
   but role-gated to `admin`/`data_curator` — intentionally not exposed in a
   tourist-facing frontend.

## One thing to change before this runs against a real deployment

`js/config.js` still points at `http://localhost:5000/api`, same as the old
frontend. Update `API_BASE_URL` there (and nowhere else) once the backend is
deployed somewhere other than your own machine.

## Design

Kept the existing maroon/gold/teal, Fraunces+Inter identity (same as your PDF
report) for continuity, but rebuilt the CSS mobile-first: base styles target
a small screen first, with `min-width` queries layering on tablet/desktop
refinements — the opposite direction from the old `max-width`-only CSS.
Primary navigation is a fixed bottom tab bar below 768px (the way most
travel apps are actually used, one-handed) and becomes a normal top nav at
desktop widths. Every tap target is at least 44px.
