from flask import Flask, request, jsonify
from unexplored_destinations import UnexploredPromoter

app = Flask(__name__)
promoter = UnexploredPromoter()


@app.after_request
def api_headers(response):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


@app.route("/api/unexplored", methods=["GET", "POST", "OPTIONS"])
def promote_unexplored():
    if request.method == "OPTIONS":
        return ("", 204)

    data = (request.get_json(silent=True) or {}) if request.method == "POST" else request.args.to_dict()

    try:
        max_crowd = int(data.get("max_crowd", 5))
        limit = int(data.get("limit", 5))
    except (TypeError, ValueError):
        return jsonify({"status": "error", "message": "max_crowd and limit must be integers"}), 400

    if not 1 <= max_crowd <= 10:
        return jsonify({"status": "error", "message": "max_crowd must be between 1 and 10"}), 400
    if not 1 <= limit <= 50:
        return jsonify({"status": "error", "message": "limit must be between 1 and 50"}), 400

    results = promoter.get_promoted_destinations(
        state=data.get("state"),
        category=data.get("category"),
        max_crowd_level=max_crowd,
        limit=limit,
    )
    return jsonify({
        "status": "success",
        "count": len(results),
        "destinations": results,
    })


if __name__ == "__main__":
    import os
    app.run(host="0.0.0.0", port=int(os.getenv("UNEXPLORED_PORT", "5002")), debug=False)
