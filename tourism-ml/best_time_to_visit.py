import sys
import json
import os
import argparse
from datetime import datetime
from typing import Dict, Any, List

try:
    from crowd_predictor import CrowdPredictorEngine
except ImportError:
    # Handle direct directory imports
    from .crowd_predictor import CrowdPredictorEngine

# Regional peak season data
REGIONAL_CLIMATE = {
    "North India": {
        "best_months": ["October", "November", "December", "January", "February", "March"],
        "avoid_months": ["May", "June"],
        "reason": "Mild, pleasant winter weather ideal for daytime sightseeing."
    },
    "South India": {
        "best_months": ["November", "December", "January", "February"],
        "avoid_months": ["June", "July", "August"],
        "reason": "Cooler temperatures and lower monsoon humidity."
    },
    "West India": {
        "best_months": ["October", "November", "December", "January", "February", "March"],
        "avoid_months": ["June", "July", "August"],
        "reason": "Moderate coastal climate following heavy monsoons."
    },
    "Default": {
        "best_months": ["October", "November", "December", "January", "February"],
        "avoid_months": ["May", "June"],
        "reason": "Comfortable weather conditions."
    }
}


class BestTimeAnalyzer:
    """Engine that computes hourly suitability scores and best visiting windows."""

    def __init__(self):
        json_path = os.path.join(os.path.dirname(__file__), "monuments.json")
        self.crowd_engine = CrowdPredictorEngine(monuments_json_path=json_path)

    def calculate_suitability(self, crowd_level: float, temp_c: float, rain_prob: float) -> float:
        """Computes Visit Suitability Score S_visit (0 to 100)."""
        # 1. Low crowd score (Empty = 100, Packed = 0)
        crowd_score = (10.0 - crowd_level) * 10.0

        # 2. Thermal comfort score (Optimal range: 18 - 28 C)
        if 18.0 <= temp_c <= 28.0:
            temp_score = 100.0
        else:
            temp_score = max(0.0, 100.0 - abs(temp_c - 23.0) * 4.5)

        # 3. Precipitation score
        rain_score = max(0.0, 100.0 - (rain_prob * 100.0))

        # Weighted calculation: 45% crowd, 35% temperature, 20% rain
        score = (0.45 * crowd_score) + (0.35 * temp_score) + (0.20 * rain_score)
        return round(score, 1)

    def analyze(
        self,
        monument: str,
        date_str: Optional[str] = None,
        region: str = "North India",
        is_holiday: bool = False
    ) -> Dict[str, Any]:
        """Evaluates daily time slots and returns structured best-time recommendations."""
        
        # Standard daily sightseeing slots
        slots = [
            {"label": "Early Morning (06:00 AM - 09:00 AM)", "hour": 7, "temp": 20.0, "rain": 0.0},
            {"label": "Late Morning (09:00 AM - 12:00 PM)", "hour": 10, "temp": 25.0, "rain": 0.05},
            {"label": "Afternoon (12:00 PM - 03:00 PM)", "hour": 13, "temp": 31.0, "rain": 0.10},
            {"label": "Late Afternoon (03:00 PM - 06:00 PM)", "hour": 16, "temp": 27.0, "rain": 0.05},
        ]

        slot_results = []
        for slot in slots:
            crowd_res = self.crowd_engine.predict(
                monument_name=monument,
                date_str=date_str,
                hour=slot["hour"],
                temp_c=slot["temp"],
                rain_prob=slot["rain"],
                is_holiday=is_holiday
            )

            predicted_crowd = crowd_res["predicted_crowd_level"]
            suitability = self.calculate_suitability(predicted_crowd, slot["temp"], slot["rain"])

            slot_results.append({
                "time_slot": slot["label"],
                "predicted_crowd_level": predicted_crowd,
                "crowd_status": crowd_res["status"],
                "suitability_score": suitability,
                "expected_temp_c": slot["temp"]
            })

        # Sort slots by highest suitability score
        slot_results.sort(key=lambda x: x["suitability_score"], reverse=True)

        climate_info = REGIONAL_CLIMATE.get(region, REGIONAL_CLIMATE["Default"])

        return {
            "monument": monument.title(),
            "best_time_slot_today": slot_results[0]["time_slot"],
            "best_time_suitability_score": slot_results[0]["suitability_score"],
            "best_months_overall": climate_info["best_months"],
            "months_to_avoid": climate_info["avoid_months"],
            "seasonal_recommendation": climate_info["reason"],
            "all_time_slots_evaluated": slot_results
        }


def main():
    parser = argparse.ArgumentParser(description="Best Time to Visit Prediction Engine")
    parser.add_argument("--json", type=str, help="Input JSON parameters")
    args = parser.parse_args()

    params = {
        "monument": "Taj Mahal",
        "date": datetime.now().strftime("%Y-%m-%d"),
        "region": "North India",
        "is_holiday": False
    }

    if args.json:
        try:
            input_json = json.loads(args.json)
            params.update(input_json)
        except Exception as e:
            print(json.dumps({"status": "error", "message": f"Invalid JSON payload: {str(e)}"}))
            sys.exit(1)

    analyzer = BestTimeAnalyzer()
    result = analyzer.analyze(
        monument=params.get("monument", "Taj Mahal"),
        date_str=params.get("date"),
        region=params.get("region", "North India"),
        is_holiday=bool(params.get("is_holiday", False))
    )

    print(json.dumps({"status": "success", "data": result}, indent=2))


if __name__ == "__main__":
    main()