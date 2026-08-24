"""
HTTP API for the tourism ML services.

Run:
    python ai_api.py

Endpoints:
    GET  /healthz
    POST /predict/crowd
    POST /api/predict/crowd   (compatibility alias)
"""
from flask import Flask, jsonify, request
from crowd_predictor import CrowdPredictorEngine
import os

app = Flask(__name__)
DATASET = os.path.join(os.path.dirname(__file__), "monuments.json")
if not os.path.exists(DATASET):
    DATASET = os.path.join(os.path.dirname(__file__), "monument.json")

ENGINE = CrowdPredictorEngine(monuments_json_path=DATASET)


def _as_bool(value):
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, (int, float)):
        return value != 0
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


def _json_error(message, status=400, detail=None):
    body = {"status": "error", "message": message}
    if detail:
        body["detail"] = str(detail)
    return jsonify(body), status


@app.after_request
def add_api_headers(response):
    # Prevent stale browser/proxy cache responses. A 304 is a normal cache
    # response, but API clients generally want a fresh JSON response.
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


@app.route("/healthz", methods=["GET", "OPTIONS"])
def healthz():
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


@app.errorhandler(404)
def not_found(_):
    return _json_error("API endpoint not found. Use POST /predict/crowd.", 404)


@app.errorhandler(405)
def method_not_allowed(_):
    return _json_error("HTTP method not allowed.", 405)


@app.errorhandler(500)
def internal_error(_):
    return _json_error("Internal server error.", 500)


if __name__ == "__main__":
    port = int(os.getenv("ML_PORT", "5001"))
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
