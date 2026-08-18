import datetime

def estimate_crowd(monument_name, date, is_festival=False):
    """Very simple rules-based crowd estimate."""
    weekday = date.weekday()  # 0 = Monday, 6 = Sunday

    score = 0
    if weekday >= 5:          # weekend
        score += 2
    if is_festival:
        score += 3
    if date.month in [10, 11, 12, 1]:  # peak tourist season, adjust as needed
        score += 1

    if score >= 4:
        return "high"
    elif score >= 2:
        return "medium"
    else:
        return "low"

# Try it:
print(estimate_crowd("Red Fort", datetime.date(2026, 12, 25), is_festival=True))