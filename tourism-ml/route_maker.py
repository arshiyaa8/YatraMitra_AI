import sys
import json
import os
import argparse
import math
import urllib.parse
import urllib.request
from typing import List, Dict, Any, Optional

DEFAULT_START = {
    "name": "JIIT Noida",
    "lat": 28.6304,
    "lng": 77.3721,
}

# Accessibility aliases let the frontend use friendly names.
ACCESSIBILITY_ALIASES = {
    "wheelchair": "wheelchair_accessible",
    "wheelchair_access": "wheelchair_accessible",
    "mobility": "wheelchair_accessible",
    "low_mobility": "wheelchair_accessible",
    "ramp": "ramp_available",
    "ramps": "ramp_available",
    "visual": "audio_guides",
    "hearing": "sign_language",
    "guided": "guided_tours",
    "guide": "guided_tours",
}


class RouteOptimizer:
    """Interactive route optimizer with accessibility and offbeat-destination support.

    The optimizer can:
      * accept any monument from monuments.json (no hard-coded waypoint list),
      * search/list monuments for frontend selection,
      * recommend lesser-known destinations as optional stops,
      * filter/score stops for accessibility needs, and
      * optimize the selected route with a nearest-neighbor heuristic.

    Distances are geographic (Haversine), not road-network distances. If a
    selected monument has no coordinates, an optional Nominatim geocoding
    lookup is attempted and the result is cached in memory.
    """

    def __init__(self, dataset_path: str = None, geocode_missing: bool = True):
        if dataset_path is None:
            base = os.path.dirname(__file__)
            preferred = os.path.join(base, "monuments.json")
            fallback = os.path.join(base, "monument.json")
            dataset_path = preferred if os.path.exists(preferred) else fallback
        self.dataset_path = dataset_path
        self.geocode_missing = geocode_missing
        self.monuments = self._load_data(dataset_path)
        self._coordinate_cache: Dict[str, Dict[str, float]] = {}

    def _load_data(self, path: str) -> List[Dict[str, Any]]:
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            monuments = data if isinstance(data, list) else data.get("monuments", [])
            return [m for m in monuments if isinstance(m, dict)]
        except (OSError, json.JSONDecodeError, TypeError):
            return []

    @staticmethod
    def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371.0
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
        return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    @staticmethod
    def _normalise_accessibility(requirements: Optional[List[str]]) -> List[str]:
        result = []
        for item in requirements or []:
            key = str(item).strip().lower().replace("-", "_").replace(" ", "_")
            key = ACCESSIBILITY_ALIASES.get(key, key)
            if key and key not in result:
                result.append(key)
        return result

    def _geocode(self, monument: Dict[str, Any]) -> Optional[Dict[str, float]]:
        """Resolve missing coordinates through OpenStreetMap Nominatim.

        This is only a fallback. Production deployments should store verified
        lat/lng in monuments.json or use a dedicated geocoding provider.
        """
        key = str(monument.get("id") or monument.get("name"))
        if key in self._coordinate_cache:
            return self._coordinate_cache[key]
        if not self.geocode_missing:
            return None

        query = ", ".join(filter(None, [monument.get("name"), monument.get("city"), "India"]))
        url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({
            "q": query,
            "format": "jsonv2",
            "limit": 1,
        })
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "YatraMitra-RouteOptimizer/1.0"})
            with urllib.request.urlopen(req, timeout=5) as response:
                results = json.loads(response.read().decode("utf-8"))
            if results:
                coords = {"lat": float(results[0]["lat"]), "lng": float(results[0]["lon"])}
                self._coordinate_cache[key] = coords
                return coords
        except Exception:
            pass
        return None

    def _with_coordinates(self, monument: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        result = dict(monument)
        try:
            if result.get("lat") is not None and result.get("lng") is not None:
                result["lat"] = float(result["lat"])
                result["lng"] = float(result["lng"])
                return result
        except (TypeError, ValueError):
            pass

        coords = self._geocode(result)
        if coords:
            result.update(coords)
            return result
        return None

    def get_monument_by_id_or_name(self, identifier: Any) -> Optional[Dict[str, Any]]:
        text = str(identifier).strip()
        for monument in self.monuments:
            if str(monument.get("id", "")) == text or str(monument.get("name", "")).casefold() == text.casefold():
                return self._with_coordinates(monument)
        return None

    def search_monuments(self, query: str = "", limit: int = 50) -> List[Dict[str, Any]]:
        q = str(query or "").strip().casefold()
        matches = []
        for monument in self.monuments:
            haystack = " ".join([
                str(monument.get("name", "")),
                str(monument.get("city", "")),
                " ".join(map(str, monument.get("tags", []))),
            ]).casefold()
            if not q or q in haystack:
                matches.append({
                    "id": monument.get("id"),
                    "name": monument.get("name"),
                    "city": monument.get("city"),
                    "popularity": monument.get("popularity", 5),
                    "accessibility_tags": monument.get("accessibility_tags", []),
                    "tags": monument.get("tags", []),
                })
        return matches[:max(1, min(int(limit), 200))]

    def recommend_lesser_known(
        self,
        start_loc: Dict[str, Any],
        limit: int = 3,
        accessibility: Optional[List[str]] = None,
        exclude_ids: Optional[List[Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Recommend nearby, lower-popularity destinations instead of only famous sites."""
        required = self._normalise_accessibility(accessibility)
        excluded = {str(x) for x in (exclude_ids or [])}
        candidates = []

        for monument in self.monuments:
            if str(monument.get("id")) in excluded:
                continue
            enriched = self._with_coordinates(monument)
            if not enriched:
                continue
            tags = set(map(str, enriched.get("accessibility_tags", [])))
            missing = [req for req in required if req not in tags]
            if missing:
                continue

            distance = self._haversine_distance(
                float(start_loc["lat"]), float(start_loc["lng"]),
                enriched["lat"], enriched["lng"]
            )
            popularity = float(enriched.get("popularity", 5) or 5)
            # Lower popularity is better; proximity still matters.
            score = (10.0 - popularity) * 3.0 + max(0.0, 50.0 - distance) * 0.08
            candidates.append((score, distance, enriched))

        candidates.sort(key=lambda x: (-x[0], x[1]))
        result = []
        for score, distance, monument in candidates[:max(1, int(limit))]:
            item = dict(monument)
            item["distance_from_start_km"] = round(distance, 2)
            item["discovery_score"] = round(score, 2)
            item["reason"] = "Lesser-known destination with a lower popularity score"
            result.append(item)
        return result

    def optimize_route(
        self,
        start_loc: Dict[str, Any],
        waypoints: List[Any],
        accessibility: Optional[List[str]] = None,
        promote_lesser_known: bool = True,
        lesser_known_limit: int = 1,
    ) -> Dict[str, Any]:
        if not isinstance(start_loc, dict) or start_loc.get("lat") is None or start_loc.get("lng") is None:
            start_loc = dict(DEFAULT_START)
        else:
            start_loc = dict(start_loc)
            start_loc["lat"] = float(start_loc["lat"])
            start_loc["lng"] = float(start_loc["lng"])

        required = self._normalise_accessibility(accessibility)
        selected = []
        invalid = []
        seen = set()

        # Every waypoint comes from the user's request; there is no fixed list.
        for wp in waypoints or []:
            monument = self.get_monument_by_id_or_name(wp)
            if not monument:
                invalid.append(str(wp))
                continue
            key = str(monument.get("id", monument.get("name"))).casefold()
            if key in seen:
                continue
            seen.add(key)
            tags = set(map(str, monument.get("accessibility_tags", [])))
            missing = [req for req in required if req not in tags]
            monument["accessibility_match"] = not missing
            monument["missing_accessibility"] = missing
            selected.append(monument)

        # Add at most N lower-popularity stops, but only when explicitly enabled.
        discovery = []
        if promote_lesser_known and lesser_known_limit > 0:
            discovery = self.recommend_lesser_known(
                start_loc,
                limit=lesser_known_limit,
                accessibility=required,
                exclude_ids=[m.get("id") for m in selected],
            )
            for candidate in discovery:
                key = str(candidate.get("id", candidate.get("name"))).casefold()
                if key not in seen:
                    candidate["is_discovery_stop"] = True
                    selected.append(candidate)
                    seen.add(key)

        if not selected:
            return {
                "status": "error",
                "message": "Select at least one valid monument.",
                "invalid_waypoints": invalid,
                "available_monuments": len(self.monuments),
            }

        current = start_loc
        unvisited = list(selected)
        optimized_path = [current]
        total_distance = 0.0

        # Nearest-neighbor optimization over the user's selected stops + optional discovery stops.
        while unvisited:
            nearest = min(
                unvisited,
                key=lambda wp: self._haversine_distance(
                    current["lat"], current["lng"], wp["lat"], wp["lng"]
                ),
            )
            distance = self._haversine_distance(
                current["lat"], current["lng"], nearest["lat"], nearest["lng"]
            )
            total_distance += distance
            optimized_path.append(nearest)
            unvisited.remove(nearest)
            current = nearest

        route = []
        for index, location in enumerate(optimized_path):
            route.append({
                "step": index,
                "name": location.get("name"),
                "id": location.get("id"),
                "lat": location.get("lat"),
                "lng": location.get("lng"),
                "city": location.get("city"),
                "is_discovery_stop": bool(location.get("is_discovery_stop", False)),
                "accessibility_match": location.get("accessibility_match", True),
                "missing_accessibility": location.get("missing_accessibility", []),
            })

        return {
            "status": "success",
            "optimization": "nearest_neighbor",
            "total_distance_km": round(total_distance, 2),
            "estimated_travel_time_mins": round(total_distance * 2.5),
            "accessibility_requirements": required,
            "invalid_waypoints": invalid,
            "discovery_stops": [
                {"id": x.get("id"), "name": x.get("name"), "reason": x.get("reason")}
                for x in discovery
            ],
            "route": route,
        }


def interactive_cli(optimizer: RouteOptimizer) -> None:
    """Simple terminal UI so users can select any monument interactively."""
    print("\nYatraMitra Interactive Route Maker")
    print("Type 'search <text>', 'list', 'recommend', 'route', or 'quit'.")

    selected = []
    start = dict(DEFAULT_START)
    accessibility = []

    while True:
        command = input("\nroute> ").strip()
        if not command:
            continue
        if command.casefold() in {"quit", "exit", "q"}:
            break

        if command.casefold() == "list":
            for m in optimizer.search_monuments(limit=200):
                print(f"{m['id']}: {m['name']} ({m.get('city', '')}) | popularity={m.get('popularity')}")
            continue

        if command.casefold().startswith("search "):
            query = command[7:].strip()
            for m in optimizer.search_monuments(query=query, limit=50):
                print(f"{m['id']}: {m['name']} ({m.get('city', '')})")
            continue

        if command.casefold().startswith("select "):
            identifier = command[7:].strip()
            if optimizer.get_monument_by_id_or_name(identifier):
                selected.append(identifier)
                print(f"Selected: {identifier}")
            else:
                print("Monument not found. Use search/list to choose one.")
            continue

        if command.casefold().startswith("accessibility "):
            accessibility = [x.strip() for x in command[14:].split(",") if x.strip()]
            print("Accessibility requirements:", accessibility)
            continue

        if command.casefold() == "recommend":
            recommendations = optimizer.recommend_lesser_known(start, limit=5, accessibility=accessibility)
            for m in recommendations:
                print(f"{m['id']}: {m['name']} ({m.get('city', '')}) - {m['reason']}")
            continue

        if command.casefold() == "route":
            result = optimizer.optimize_route(start, selected, accessibility=accessibility, promote_lesser_known=True)
            print(json.dumps(result, indent=2))
            continue

        print("Commands: list | search <text> | select <id/name> | accessibility <wheelchair,ramp,...> | recommend | route | quit")


def main() -> None:
    parser = argparse.ArgumentParser(description="Interactive accessibility-aware route maker")
    parser.add_argument("--json", type=str, help="Input JSON payload")
    parser.add_argument("--interactive", action="store_true", help="Start interactive terminal mode")
    parser.add_argument("--no-geocode", action="store_true", help="Do not geocode monuments missing lat/lng")
    args = parser.parse_args()

    optimizer = RouteOptimizer(geocode_missing=not args.no_geocode)

    if args.interactive or not args.json:
        interactive_cli(optimizer)
        return

    try:
        params = json.loads(args.json)
    except json.JSONDecodeError as exc:
        print(json.dumps({"status": "error", "message": f"Invalid JSON: {exc}"}))
        sys.exit(1)

    start_location = params.get("start_location") or DEFAULT_START
    waypoints = params.get("waypoints", [])
    if isinstance(waypoints, str):
        waypoints = [x.strip() for x in waypoints.split(",") if x.strip()]

    result = optimizer.optimize_route(
        start_loc=start_location,
        waypoints=waypoints,
        accessibility=params.get("accessibility", params.get("accessibility_requirements", [])),
        promote_lesser_known=bool(params.get("promote_lesser_known", True)),
        lesser_known_limit=int(params.get("lesser_known_limit", 1)),
    )
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()