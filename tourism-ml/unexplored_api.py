from flask import Flask, request, jsonify
from unexplored_destinations import UnexploredPromoter

app = Flask(__name__)
promoter = UnexploredPromoter()


@app.route("/api/unexplored", methods=["GET", "POST"])
def promote_unexplored():
    """HTTP Endpoint returning unexplored tourist destinations without changing source code."""
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
    else:
        data = request.args.to_dict()

    state = data.get("state")
    category = data.get("category")
    max_crowd = int(data.get("max_crowd", 5))
    limit = int(data.get("limit", 5))

    results = promoter.get_promoted_destinations(
        state=state,
        category=category,
        max_crowd_level=max_crowd,
        limit=limit
    )

    return jsonify({
        "status": "success",
        "count": len(results),
        "destinations": results
    })


if __name__ == "__main__":
    # Runs on port 5001 to avoid conflicts with standard services
    app.run(host="0.0.0.0", port=5001, debug=False)