import sys
import json
import os
import argparse
from datetime import datetime
from typing import Dict, Any, Optional

# Baseline monument database (falls back to monuments.json if available)
MONUMENT_BASELINES = {
    "taj mahal": {"base_crowd": 5, "peak_hours": [10, 11, 12, 13, 14, 15], "region": "North India"},
    "qutub minar": {"base_crowd": 4, "peak_hours": [11, 12, 13, 14, 16], "region": "North India"},
    "red fort": {"base_crowd": 4, "peak_hours": [11, 12, 13, 14, 15], "region": "North India"},
    "gateway of india": {"base_crowd": 5, "peak_hours": [16, 17, 18, 19, 20], "region": "West India"},
    "amer fort": {"base_crowd": 4, "peak_hours": [10, 11, 12, 13, 14, 15], "region": "North India"},
    "default": {"base_crowd": 3, "peak_hours": [11, 12, 13, 14, 15, 16], "region": "North India"}
}


def _to_bool(value):
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, (int, float)):
        return value != 0
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


class CrowdPredictorEngine:
    """Core Crowd Prediction Engine utilizing multi-factor inputs."""

    def __init__(self, monuments_json_path: Optional[str] = None):
        self.baselines = MONUMENT_BASELINES
        if monuments_json_path and os.path.exists(monuments_json_path):
            self._load_monuments_file(monuments_json_path)

    def _load_monuments_file(self, path: str):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                items = data if isinstance(data, list) else data.get("monuments", [])
                for item in items:
                    name = item.get("name", "").lower()
                    if name:
                        self.baselines[name] = {
                            "base_crowd": item.get("crowd_level", 3),
                            "peak_hours": [11, 12, 13, 14, 15, 16],
                            "region": item.get("region", "North India")
                        }
        except Exception:
            pass

    def analyze_image_signal(self, image_path: Optional[str]) -> float:
        """
        Computer Vision Crowd Estimation Hook.
        Processes local image or image features if provided.
        Returns a crowd delta modifier (+1.5 to -1.5).
        """
        if not image_path or not os.path.exists(image_path):
            return 0.0

        try:
            # Fallback lightweight visual estimator using file size/metadata heuristics
            file_size_kb = os.path.getsize(image_path) / 1024.0
            if file_size_kb > 500:  # High detail / potentially dense crowd
                return 1.2
            elif file_size_kb < 100:  # Sparse scene / small image
                return -0.8
        except Exception:
            pass
        return 0.0

    def predict(
        self,
        monument_name: str,
        date_str: Optional[str] = None,
        hour: Optional[int] = None,
        temp_c: float = 25.0,
        rain_prob: float = 0.0,
        is_holiday: bool = False,
        image_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """Calculates predicted crowd level on a 1.0 to 10.0 scale."""
        key = monument_name.lower().strip()
        info = self.baselines.get(key, self.baselines["default"])
        base = info["base_crowd"]

        # Parse date and time factors
        if date_str:
            try:
                dt = datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                dt = datetime.now()
        else:
            dt = datetime.now()

        target_hour = hour if hour is not None else dt.hour
        day_of_week = dt.weekday()  # 0 = Monday, 6 = Sunday

        if not 0 <= float(rain_prob) <= 1:
            raise ValueError("rain_prob must be between 0 and 1")
        if not -100 <= float(temp_c) <= 100:
            raise ValueError("temp_c must be a valid Celsius value")

        # 1. Day Multiplier (Weekends carry higher density)
        day_multiplier = 1.35 if day_of_week in [5, 6] else 1.0

        # 2. Hourly Multiplier
        if target_hour in info["peak_hours"]:
            time_multiplier = 1.4
        elif 8 <= target_hour <= 18:
            time_multiplier = 1.0
        else:
            time_multiplier = 0.35  # Early morning or night

        # 3. Holiday Multiplier
        holiday_multiplier = 1.5 if is_holiday else 1.0

        # 4. Weather Adjustment Factor
        weather_factor = 1.0
        if rain_prob > 0.5:
            weather_factor *= 0.6  # Heavy rain depresses crowd
        if temp_c > 38.0 or temp_c < 5.0:
            weather_factor *= 0.75  # Extreme temperatures reduce outdoor flow

        # 5. Computer Vision Adjustment Delta
        vision_delta = self.analyze_image_signal(image_path)

        # Final Score Calculation
        raw_score = (base * day_multiplier * time_multiplier * holiday_multiplier * weather_factor) + vision_delta
        final_score = round(min(10.0, max(1.0, raw_score)), 1)

        status = "Low" if final_score <= 3.5 else ("Moderate" if final_score <= 7.0 else "High")

        return {
            "monument": monument_name.title(),
            "predicted_crowd_level": final_score,
            "status": status,
            "datetime_evaluated": f"{dt.strftime('%Y-%m-%d')} {target_hour:02d}:00",
            "factors": {
                "base_rating": base,
                "day_multiplier": day_multiplier,
                "time_multiplier": time_multiplier,
                "holiday_multiplier": holiday_multiplier,
                "weather_adjustment": round(weather_factor, 2),
                "vision_delta": vision_delta
            }
        }


def main():
    parser = argparse.ArgumentParser(description="Multi-factor Crowd Prediction Model")
    parser.add_argument("--json", type=str, help="Input parameters in JSON string format")
    args = parser.parse_args()

    # Default query parameters
    params = {
        "monument": "Taj Mahal",
        "date": datetime.now().strftime("%Y-%m-%d"),
        "hour": 14,
        "temp": 26.0,
        "rain_prob": 0.0,
        "is_holiday": False,
        "image_path": None
    }

    if args.json:
        try:
            input_json = json.loads(args.json)
            params.update(input_json)
        except Exception as e:
            print(json.dumps({"status": "error", "message": f"Invalid JSON payload: {str(e)}"}))
            sys.exit(1)

    json_path = os.path.join(os.path.dirname(__file__), "monuments.json")
    engine = CrowdPredictorEngine(monuments_json_path=json_path)

    result = engine.predict(
        monument_name=params.get("monument", "Taj Mahal"),
        date_str=params.get("date"),
        hour=params.get("hour"),
        temp_c=float(params.get("temp", 25.0)),
        rain_prob=float(params.get("rain_prob", 0.0)),
        is_holiday=_to_bool(params.get("is_holiday", False)),
        image_path=params.get("image_path")
    )

    print(json.dumps({"status": "success", "data": result}, indent=2))


if __name__ == "__main__":
    main()