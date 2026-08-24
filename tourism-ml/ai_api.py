"""
ai_api.py — Machine Learning Services REST Gateway

Provides HTTP API access to all Python ML engines:
- CrowdPredictorEngine (/predict/crowd): Footfall density and quiet hour prediction.
- RouteOptimizer (/route/plan): Traveling Salesperson Route optimization with accessibility filtering.
- UnexploredPromoter (/api/unexplored): Hidden gems scoring and low-footfall tourism promotion.
- BestTimeToVisitEngine (/predict/best-time): Thermal comfort and visiting hour suitability.
"""

from flask import Flask, jsonify, request
from crowd_predictor import CrowdPredictorEngine
import os
import base64

app = Flask(__name__)
DATASET = os.path.join(os.path.dirname(__file__), "monuments.json")

# Initialize global prediction engine with canonical monument dataset
ENGINE = CrowdPredictorEngine(monuments_json_path=DATASET)


def _as_bool(value):
    """Safely converts string/number/boolean query values to a boolean flag."""
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, (int, float)):
        return value != 0
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


def _json_error(message, status=400, detail=None):
    """Constructs a consistent JSON error response structure."""
    body = {"status": "error", "message": message}
    if detail:
        body["detail"] = str(detail)
    return jsonify(body), status


@app.after_request
def add_api_headers(response):
    """Sets standard CORS and cache prevention headers across all responses."""
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


@app.route("/healthz", methods=["GET", "OPTIONS"])
def healthz():
    """Liveness probe endpoint."""
    if request.method == "OPTIONS":
        return ("", 204)
    return jsonify({"status": "ok", "service": "tourism-ml", "model": "CrowdPredictorEngine"})


@app.route("/predict/crowd", methods=["POST", "OPTIONS"])
@app.route("/api/predict/crowd", methods=["POST", "OPTIONS"])
def predict_crowd():
    if request.method == "OPTIONS":
        return ("", 204)

    payload = request.get_json(silent=True)
    if payload is None:
        payload = {}

    if not isinstance(payload, dict):
        return _json_error("Request body must be a JSON object.")

    monument = str(payload.get("monument", "Taj Mahal")).strip()
    if not monument:
        return _json_error("monument is required")

    try:
        raw_hour = payload.get("hour")
        hour = int(raw_hour) if raw_hour not in (None, "") else None
        if hour is not None and not 0 <= hour <= 23:
            return _json_error("hour must be between 0 and 23")

        temp = float(payload.get("temp", 25.0))
        rain_prob = float(payload.get("rain_prob", 0.0))
        if not -100 <= temp <= 100:
            return _json_error("temp must be a valid Celsius value")
        if not 0 <= rain_prob <= 1:
            return _json_error("rain_prob must be between 0 and 1")

        result = ENGINE.predict(
            monument_name=monument,
            date_str=payload.get("date"),
            hour=hour,
            temp_c=temp,
            rain_prob=rain_prob,
            is_holiday=_as_bool(payload.get("is_holiday", False)),
            image_path=payload.get("image_path"),
        )
        return jsonify({"status": "success", "data": result})
    except (TypeError, ValueError) as exc:
        return _json_error(str(exc))
    except Exception as exc:
        app.logger.exception("Crowd prediction failed")
        return _json_error("Prediction failed", 500, exc)


@app.route("/route/plan", methods=["POST", "OPTIONS"])
@app.route("/api/route/plan", methods=["POST", "OPTIONS"])
def plan_route():
    if request.method == "OPTIONS":
        return ("", 204)

    payload = request.get_json(silent=True) or {}
    start_loc = payload.get("start", {"lat": 28.6139, "lng": 77.2090, "name": "Start Location"})
    waypoints = payload.get("waypoints", [])
    accessibility = payload.get("accessibility", [])
    promote_lesser_known = _as_bool(payload.get("promote_lesser_known", False))

    if not waypoints:
        return _json_error("At least one waypoint or destination is required.")

    try:
        from route_maker import RouteOptimizer
        optimizer = RouteOptimizer(dataset_path=DATASET, geocode_missing=False)
        result = optimizer.optimize_route(
            start_loc=start_loc,
            waypoints=waypoints,
            accessibility=accessibility,
            promote_lesser_known=promote_lesser_known,
            lesser_known_limit=int(payload.get("lesser_known_limit", 1)),
        )
        return jsonify({"status": "success", "data": result})
    except Exception as exc:
        app.logger.exception("Route planning failed")
        return _json_error("Route optimization failed", 500, exc)


@app.route("/api/unexplored", methods=["GET", "POST", "OPTIONS"])
@app.route("/destinations/unexplored", methods=["GET", "POST", "OPTIONS"])
@app.route("/api/destinations/unexplored", methods=["GET", "POST", "OPTIONS"])
def get_unexplored():
    if request.method == "OPTIONS":
        return ("", 204)

    data = (request.get_json(silent=True) or {}) if request.method == "POST" else request.args.to_dict()

    try:
        from unexplored_destinations import UnexploredPromoter
        promoter = UnexploredPromoter(dataset_path=DATASET)
        max_crowd = int(data.get("max_crowd", 10))
        limit = int(data.get("limit", 10))
        state = data.get("state")
        category = data.get("category")

        results = promoter.get_promoted_destinations(
            state=state,
            category=category,
            max_crowd_level=max_crowd,
            limit=limit,
        )
        return jsonify({"status": "success", "count": len(results), "destinations": results, "data": results})
    except Exception as exc:
        app.logger.exception("Unexplored destinations failed")
        return _json_error("Failed to load unexplored destinations", 500, exc)


@app.route("/predict/best-time", methods=["POST", "OPTIONS"])
@app.route("/api/predict/best-time", methods=["POST", "OPTIONS"])
def predict_best_time():
    if request.method == "OPTIONS":
        return ("", 204)

    payload = request.get_json(silent=True) or {}
    monument = str(payload.get("monument", "Taj Mahal")).strip()
    date_str = payload.get("date")
    region = payload.get("region", "North India")
    is_holiday = _as_bool(payload.get("is_holiday", False))

    try:
        from best_time_to_visit import BestTimeAnalyzer
        analyzer = BestTimeAnalyzer()
        result = analyzer.analyze(monument=monument, date_str=date_str, region=region, is_holiday=is_holiday)
        return jsonify({"status": "success", "data": result})
    except Exception as exc:
        app.logger.exception("Best time analysis failed")
        return _json_error("Best time analysis failed", 500, exc)



@app.route("/voice/synthesize", methods=["POST", "OPTIONS"])
def voice_synthesize():
    if request.method == "OPTIONS":
        return ("", 204)

    payload = request.get_json(silent=True) or {}
    text = str(payload.get("text", "")).strip()
    target_lang = str(payload.get("language", "hi-IN")).strip()

    if not text:
        return _json_error("text is required")

    try:
        import voice_assistant
        if not os.getenv("SARVAM_API_KEY"):
            return _json_error("SARVAM_API_KEY not configured in environment", 503)
        temp_out = os.path.join(os.path.dirname(__file__), "temp_tts.wav")
        audio_path = voice_assistant.text_to_speech(text, target_lang=target_lang, output_path=temp_out)
        with open(audio_path, "rb") as f:
            audio_base64 = base64.b64encode(f.read()).decode("utf-8")
        if os.path.exists(temp_out):
            os.remove(temp_out)
        return jsonify({"status": "success", "audio_base64": audio_base64, "format": "audio/wav"})
    except Exception as exc:
        return _json_error(f"Voice synthesis error: {str(exc)}", 500)


@app.errorhandler(404)
def not_found(_):
    return _json_error("API endpoint not found.", 404)


@app.errorhandler(405)
def method_not_allowed(_):
    return _json_error("HTTP method not allowed.", 405)


@app.errorhandler(500)
def internal_error(_):
    return _json_error("Internal server error.", 500)


if __name__ == "__main__":
    port = int(os.getenv("ML_PORT", "5001"))
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)

