"""
unexplored_destinations.py — Hidden Gems Scoring & Sustainable Tourism Engine

Scores and promotes low-footfall heritage destinations (crowd level <= 3, high user satisfaction)
to encourage sustainable tourism distribution beyond high-density monuments.
"""

import sys
import json
import os
import argparse
from typing import List, Dict, Any

DEFAULT_DATASET_PATH = os.path.join(os.path.dirname(__file__), "monuments.json")

# Fallback curated unexplored destinations in India if JSON is unavailable
FALLBACK_UNEXPLORED = [
    {
        "id": "exp_001",
        "name": "Chopta Valley",
        "state": "Uttarakhand",
        "category": "Nature & Trekking",
        "description": "Known as the Mini Switzerland of Uttarakhand, an offbeat peaceful meadow with panoramic Himalayan views.",
        "crowd_level": 2,
        "rating": 4.8,
        "offbeat_score": 4.9,
        "image_url": "https://example.com/images/chopta.jpg",
        "tags": ["offbeat", "trekking", "nature", "mountains"]
    },
    {
        "id": "exp_002",
        "name": "Gandarvakottai Rock Cut Caves",
        "state": "Tamil Nadu",
        "category": "Heritage",
        "description": "Lesser-known rock-cut architecture displaying intricate early medieval rock carvings away from tourist crowds.",
        "crowd_level": 1,
        "rating": 4.6,
        "offbeat_score": 4.8,
        "image_url": "https://example.com/images/caves.jpg",
        "tags": ["heritage", "caves", "architecture", "unexplored"]
    },
    {
        "id": "exp_003",
        "name": "Ziro Valley",
        "state": "Arunachal Pradesh",
        "category": "Culture & Nature",
        "description": "A picturesque valley home to the Apatani tribe, pine-clad hills, and unique agricultural practices.",
        "crowd_level": 3,
        "rating": 4.9,
        "offbeat_score": 4.7,
        "image_url": "https://example.com/images/ziro.jpg",
        "tags": ["culture", "tribal", "nature", "northeast"]
    },
    {
        "id": "exp_004",
        "name": "Orchha Fort Complex",
        "state": "Madhya Pradesh",
        "category": "Historical Heritage",
        "description": "A serene historical town featuring grand palaces, cenotaphs, and temples along the Betwa River.",
        "crowd_level": 3,
        "rating": 4.7,
        "offbeat_score": 4.5,
        "image_url": "https://example.com/images/orchha.jpg",
        "tags": ["history", "palace", "architecture", "serene"]
    },
    {
        "id": "exp_005",
        "name": "Mawlynnong & Living Root Bridges",
        "state": "Meghalaya",
        "category": "Eco Tourism",
        "description": "Bio-engineered bridges woven from live tree roots set near Asia's cleanest village.",
        "crowd_level": 4,
        "rating": 4.8,
        "offbeat_score": 4.6,
        "image_url": "https://example.com/images/root_bridge.jpg",
        "tags": ["eco-tourism", "nature", "bridges", "unique"]
    }
]


class UnexploredPromoter:
    """Core recommendation engine for promoting unexplored destinations."""

    def __init__(self, dataset_path: str = DEFAULT_DATASET_PATH):
        self.dataset_path = dataset_path
        self.destinations = self._load_data()

    def _load_data(self) -> List[Dict[str, Any]]:
        """Loads destinations from JSON file or defaults to fallback dataset."""
        if os.path.exists(self.dataset_path):
            try:
                with open(self.dataset_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        return data
                    elif isinstance(data, dict) and "monuments" in data:
                        return data["monuments"]
            except Exception:
                pass
        return FALLBACK_UNEXPLORED

    def compute_hidden_gem_score(
        self, destination: Dict[str, Any], weights: Dict[str, float] = None
    ) -> float:
        """Computes the Hidden Gem Index score S_gem for a destination."""
        if weights is None:
            weights = {"crowd": 0.45, "rating": 0.35, "offbeat": 0.20}

        crowd_level = destination.get("crowd_level", 5)
        rating = destination.get("rating", 4.0)
        offbeat_score = destination.get("offbeat_score", 3.0)

        # Invert crowd level so lower crowd gives higher score
        crowd_factor = max(0.0, 10.0 - crowd_level)
        
        score = (
            weights["crowd"] * crowd_factor +
            weights["rating"] * (rating * 2) +
            weights["offbeat"] * (offbeat_score * 2)
        )
        return round(score, 2)

    def get_promoted_destinations(
        self,
        state: str = None,
        category: str = None,
        max_crowd_level: int = 5,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Filters and ranks unexplored destinations."""
        filtered = []
        
        for item in self.destinations:
            # Filter criteria for unexplored status
            item_crowd = item.get("crowd_level", 5)
            is_unexplored = item.get("unexplored", True) or item_crowd <= max_crowd_level

            if not is_unexplored:
                continue

            if state and state.lower() not in item.get("state", "").lower():
                continue

            if category and category.lower() not in item.get("category", "").lower():
                continue

            # Calculate score and tag item
            item_copy = dict(item)
            item_copy["gem_score"] = self.compute_hidden_gem_score(item_copy)
            item_copy["promotion_badge"] = "Hidden Gem" if item_copy["gem_score"] >= 7.5 else "Offbeat Spot"
            filtered.append(item_copy)

        # Sort by gem score descending
        filtered.sort(key=lambda x: x["gem_score"], reverse=True)
        return filtered[:limit]


def main():
    """CLI handler for direct execution via Node.js or terminal."""
    parser = argparse.ArgumentParser(description="Unexplored Destinations Recommendation Engine")
    parser.add_argument("--json", type=str, help="Input JSON string with parameters")
    parser.add_argument("--state", type=str, default=None, help="Filter by Indian State")
    parser.add_argument("--category", type=str, default=None, help="Filter by Category")
    parser.add_argument("--max_crowd", type=int, default=5, help="Maximum crowd level (1-10)")
    parser.add_argument("--limit", type=int, default=5, help="Number of results to return")

    args = parser.parse_args()

    # Parse JSON parameter if supplied via CLI
    state, category, max_crowd, limit = args.state, args.category, args.max_crowd, args.limit

    if args.json:
        try:
            params = json.loads(args.json)
            state = params.get("state", state)
            category = params.get("category", category)
            max_crowd = params.get("max_crowd", max_crowd)
            limit = params.get("limit", limit)
        except Exception as e:
            print(json.dumps({"status": "error", "message": f"Invalid input JSON: {str(e)}"}))
            sys.exit(1)

    promoter = UnexploredPromoter()
    results = promoter.get_promoted_destinations(
        state=state,
        category=category,
        max_crowd_level=max_crowd,
        limit=limit
    )

    output = {
        "status": "success",
        "count": len(results),
        "destinations": results
    }

    # Print clean JSON to stdout for process piping
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()