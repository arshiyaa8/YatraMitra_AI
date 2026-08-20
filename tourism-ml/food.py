"""
food.py -- Detailed information about Indian food, general and statewise.
"""

GENERAL_FOOD = [
    ("Spice levels", "Indian food is often associated with heat, but spice level varies hugely by region and dish; you can almost always ask for food to be made 'less spicy' (kam mirchi) at restaurants."),
    ("Vegetarian culture", "India has one of the largest vegetarian populations in the world; most restaurants clearly separate veg and non-veg menus, and pure-veg restaurants are common, especially in the north and west."),
    ("Street food", "Extremely popular and diverse (chaat, vada pav, momos, kathi rolls), but hygiene standards vary -- stick to stalls with high turnover and freshly cooked food, and be cautious with raw/unfiltered water-based items (like pani puri water) if you have a sensitive stomach."),
    ("Thali system", "A thali is a platter with small portions of multiple dishes (dal, sabzi, roti/rice, curd, pickle, sweet) -- a common way to sample a region's cuisine in one meal, often with unlimited refills."),
    ("Meal timing", "Lunch is often the largest meal in many households; dinner tends to be eaten later than in the West, commonly 8-10 PM."),
]

STATE_FOOD = {
    "Uttar Pradesh": "Awadhi cuisine (from Lucknow) is famous for slow-cooked biryani, kebabs (galouti kebab is legendary), and rich mutton/chicken curries using the 'dum' (sealed-pot) cooking style. Varanasi is known for its street food -- kachori-sabzi, chaat, and the sweet lassi served in clay cups (kulhads). Agra is famous for petha, a translucent sweet made from ash gourd.",
    "Rajasthan": "Known for its use of dried lentils, beans, and preserved vegetables due to the desert climate -- dal baati churma (baked wheat balls with lentils and sweet crumble) is the signature dish. Also famous for ghewar (a disc-shaped sweet) and Rajasthani thalis with a wide variety of small dishes.",
    "Punjab": "Home to butter chicken, sarson da saag with makki di roti (mustard greens with corn flatbread), and rich dairy-based food (lassi, paneer dishes). Punjabi food is generally hearty, buttery, and generously spiced.",
    "West Bengal": "Famous for its fish curries (given the river-delta geography), mustard-based gravies (shorshe), and an extraordinary range of milk-based sweets -- rasgulla, sandesh, and mishti doi (sweetened yogurt) are iconic.",
    "Tamil Nadu": "South Indian staples like dosa, idli, and sambar originated here; filter coffee is a cultural institution, and banana-leaf meals (a full thali served on a banana leaf) are a traditional dining experience.",
    "Kerala": "Coconut-heavy cuisine given its coastal geography -- appam with stew, fish curry (meen curry), and the elaborate Onam sadhya (a 20+ dish vegetarian feast on a banana leaf) are highlights.",
    "Maharashtra": "Known for vada pav (a spiced potato fritter in a bun, often called India's 'burger'), misal pav (spicy sprouted lentil curry), and Kolhapuri cuisine known for its intense heat.",
    "Gujarat": "Predominantly vegetarian and known for a sweet-savory balance in its dishes; dhokla (steamed fermented rice/lentil cake) and Gujarati thalis (which often include a small sweet dish alongside savory ones) are signatures.",
}


def show_general_food():
    print("\n=== General Indian Food Culture ===\n")
    for i, (title, desc) in enumerate(GENERAL_FOOD, start=1):
        print(f"{i}. {title}")
        print(f"   {desc}\n")


def choose_state_food():
    states = list(STATE_FOOD.keys())
    print("Choose a state for detailed food notes:")
    for i, state in enumerate(states, start=1):
        print(f"  {i}. {state}")
    choice = input(f"Enter number (1-{len(states)}): ").strip()
    if choice.isdigit() and 1 <= int(choice) <= len(states):
        state = states[int(choice) - 1]
        print(f"\n=== {state} Food ===\n{STATE_FOOD[state]}\n")
    else:
        print("Invalid choice.")


if __name__ == "__main__":
    show_general_food()
    choose_state_food()