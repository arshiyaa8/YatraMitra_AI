"""
ai_api.py -- HTTP API wrapper around the crowd prediction engine.

Run from tourism-ml/:
    python ai_api.py

The Node backend calls POST /predict/crowd. The frontend never talks to this
service directly; this keeps the existing frontend API contract unchanged.
"""
from flask import Flask, jsonify, request
from crowd_predictor import CrowdPredictorEngine
import os

app = Flask(__name__)

ENGINE = CrowdPredictorEngine(
    monuments_json_path=os.path.join(os.path.dirname(__file__), "monuments.json")
)


def _as_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "y", "on"}
    return bool(value)


@app.get("/healthz")
def healthz():
    return jsonify({"status": "ok", "service": "tourism-ml", "model": "CrowdPredictorEngine"})


@app.post("/predict/crowd")
def predict_crowd():
    payload = request.get_json(silent=True) or {}

    monument = str(payload.get("monument", "Taj Mahal")).strip()
    if not monument:
        return jsonify({"status": "error", "message": "monument is required"}), 400

    try:
        hour = payload.get("hour")
        hour = int(hour) if hour is not None else None
        if hour is not None and not 0 <= hour <= 23:
            raise ValueError("hour must be between 0 and 23")

        result = ENGINE.predict(
            monument_name=monument,
            date_str=payload.get("date"),
            hour=hour,
            temp_c=float(payload.get("temp", 25.0)),
            rain_prob=float(payload.get("rain_prob", 0.0)),
            is_holiday=_as_bool(payload.get("is_holiday", False)),
            image_path=payload.get("image_path"),
        )
        return jsonify({"status": "success", "data": result})
    except (TypeError, ValueError) as exc:
        return jsonify({"status": "error", "message": str(exc)}), 400
    except Exception as exc:
        app.logger.exception("Crowd prediction failed")
        return jsonify({"status": "error", "message": "Prediction failed", "detail": str(exc)}), 500


if __name__ == "__main__":
    # Port 5001 avoids the Node backend's default 5000.
    app.run(host="0.0.0.0", port=int(os.getenv("ML_PORT", "5001")), debug=False)
