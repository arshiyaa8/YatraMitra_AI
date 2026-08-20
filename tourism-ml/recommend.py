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


def show_monument_details(m):
    """Print full history and do's/don'ts for a single monument."""
    print(f"\n{'=' * 50}")
    print(f"{m['name']} ({m['city']})")
    print(f"{'=' * 50}")
    print(f"\nHistory:\n{m.get('history', 'Not available.')}")
    print(f"\nDo's and Don'ts:")
    for tip in m.get("dos_donts", []):
        print(f"  - {tip}")
    print()


def search_and_view():
    """
    Menu-driven flow: ask for preference tags, show matches,
    then let the user pick one to see its full history + dos_donts.
    (This stands in for a 'button' until the site is wired up.)
    """
    raw = input("Enter preference tags, comma-separated (e.g. historical,offbeat): ")
    prefs = [p.strip() for p in raw.split(",") if p.strip()]

    access_input = input("Need wheelchair accessibility? (y/n): ").strip().lower()
    needs_accessibility = access_input == "y"

    results = recommend(prefs, needs_accessibility=needs_accessibility)
    print_recommendations(results)

    if not results:
        return

    choice = input("Enter the number of a monument to see full details (or press Enter to skip): ").strip()
    if choice.isdigit():
        idx = int(choice) - 1
        if 0 <= idx < len(results):
            _, _, _, m = results[idx]
            show_monument_details(m)
        else:
            print("Invalid number.")


if __name__ == "__main__":
    search_and_view()