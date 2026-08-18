import json

# Load monument data from the JSON file instead of hardcoding it here.
# monuments.json should sit in the same folder as this script.
with open("monuments.json", "r", encoding="utf-8") as f:
    monuments = json.load(f)


def recommend(user_preferences, needs_accessibility=False, sort_by_popularity=True):
    """
    user_preferences: list like ["historical", "offbeat"]
    needs_accessibility: if True, only keep monuments tagged wheelchair_accessible
    sort_by_popularity: if True, ties in tag-match score are broken using popularity

    Returns monuments sorted by:
      1. how many preferences they match (highest first)
      2. popularity score (highest first) -- used as a tiebreaker
    """
    results = []

    for m in monuments:
        accessibility_tags = m.get("accessibility_tags", [])
        if needs_accessibility and "wheelchair_accessible" not in accessibility_tags:
            continue  # skip if it doesn't meet a hard requirement

        tag_matches = set(user_preferences) & set(m.get("tags", []))
        score = len(tag_matches)
        popularity = m.get("popularity", 0)

        if score > 0:
            results.append((score, popularity, tag_matches, m))

    if sort_by_popularity:
        # sort by match score first, then popularity as tiebreaker
        results.sort(key=lambda x: (x[0], x[1]), reverse=True)
    else:
        results.sort(key=lambda x: x[0], reverse=True)

    return results


def print_recommendations(results):
    """
    Nicely prints out each recommended monument, its matched tags,
    and a simple star-based popularity bar, using a for loop.
    """
    if not results:
        print("No monuments matched your preferences. Try different tags!")
        return

    for rank, (score, popularity, tag_matches, m) in enumerate(results, start=1):
        stars = "★" * popularity + "☆" * (10 - popularity)
        print(f"{rank}. {m['name']} ({m['city']})")
        print(f"   {m['shortDescription']}")
        print(f"   Matched tags: {', '.join(sorted(tag_matches))}")
        print(f"   Popularity:  {stars} ({popularity}/10)")
        print(f"   Entry fee:   Rs.{m.get('entryFeeINR', 0)}")
        print()


if __name__ == "__main__":
    # Example 1: broad historical + offbeat search
    print("=== Historical & Offbeat picks ===\n")
    matches = recommend(["historical", "offbeat"])
    print_recommendations(matches)

    # Example 2: only wheelchair-accessible religious/spiritual sites
    print("=== Accessible religious/spiritual picks ===\n")
    matches = recommend(["religious", "spiritual"], needs_accessibility=True)
    print_recommendations(matches)

    # Example 3: unexplored/offbeat gems
    print("=== Unexplored gems ===\n")
    matches = recommend(["unexplored", "offbeat"])
    print_recommendations(matches)