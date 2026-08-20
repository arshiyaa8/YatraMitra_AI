import sys
import json
import os
import argparse
import math
from typing import List, Dict, Any

# Ultimate fallback starting point if no location is provided by the frontend
DEFAULT_START = {
    "name": "JIIT Noida",
    "lat": 28.6304,
    "lng": 77.3721
}

class RouteOptimizer:
    """Engine to generate interactive, optimized travel itineraries."""

    def __init__(self, dataset_path: str = None):
        if dataset_path is None:
            dataset_path = os.path.join(os.path.dirname(__file__), "monuments.json")
        self.monuments = self._load_data(dataset_path)

    def _load_data(self, path: str) -> List[Dict[str, Any]]:
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data if isinstance(data, list) else data.get("monuments", [])
        except Exception:
            return []

    def _haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculates distance in kilometers between two GPS coordinates."""
        R = 6371.0 # Earth radius in km
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)

        a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
        return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    def get_monument_by_id_or_name(self, identifier: str) -> Dict[str, Any]:
        """Finds a monument from the dataset; generates dummy coords if missing."""
        for m in self.monuments:
            if m.get("id") == identifier or m.get("name", "").lower() == identifier.lower():
                return m
        
        # If not found in DB, return a mock representation to prevent crashing
        return {"name": identifier.title(), "lat": None, "lng": None}

    def optimize_route(self, start_loc: Dict[str, Any], waypoints: List[str]) -> Dict[str, Any]:
        """Arranges waypoints into the most efficient geographical order."""
        if not start_loc.get("lat") or not start_loc.get("lng"):
            start_loc = DEFAULT_START

        current_location = start_loc
        unvisited = []
        
        # Resolve waypoints to actual data
        for wp in waypoints:
            monument_data = self.get_monument_by_id_or_name(wp)
            # Assign slight coordinate variations if DB lacks exact coords for testing
            if not monument_data.get("lat"):
                import random
                monument_data["lat"] = current_location["lat"] + random.uniform(-0.05, 0.05)
                monument_data["lng"] = current_location["lng"] + random.uniform(-0.05, 0.05)
            unvisited.append(monument_data)

        optimized_path = [current_location]
        total_distance = 0.0

        # Nearest Neighbor Algorithm
        while unvisited:
            nearest_wp = None
            shortest_dist = float('inf')

            for wp in unvisited:
                dist = self._haversine_distance(
                    current_location["lat"], current_location["lng"],
                    wp["lat"], wp["lng"]
                )
                if dist < shortest_dist:
                    shortest_dist = dist
                    nearest_wp = wp

            # Move to the nearest waypoint
            optimized_path.append(nearest_wp)
            unvisited.remove(nearest_wp)
            total_distance += shortest_dist
            current_location = nearest_wp

        return {
            "status": "success",
            "total_distance_km": round(total_distance, 2),
            "estimated_travel_time_mins": round(total_distance * 2.5), # Assuming ~24 km/h average city speed
            "route": [{"step": i, "name": loc["name"], "lat": loc["lat"], "lng": loc["lng"]} for i, loc in enumerate(optimized_path)]
        }

def main():
    parser = argparse.ArgumentParser(description="Interactive Route Maker")
    parser.add_argument("--json", type=str, help="Input JSON payload")
    args = parser.parse_args()

    # Default fallback state
    start_location = DEFAULT_START
    waypoints = ["Red Fort", "India Gate", "Qutub Minar"] 

    if args.json:
        try:
            params = json.loads(args.json)
            if "start_location" in params:
                start_location = params["start_location"]
            if "waypoints" in params:
                waypoints = params["waypoints"]
        except Exception as e:
            print(json.dumps({"status": "error", "message": f"Invalid JSON: {str(e)}"}))
            sys.exit(1)

    optimizer = RouteOptimizer()
    result = optimizer.optimize_route(start_loc=start_location, waypoints=waypoints)
    
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()