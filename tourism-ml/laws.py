"""
laws.py -- General information on India's tourist-relevant laws, national
and statewise. This is general public information for travelers, NOT legal
advice. Laws change; always verify current rules with official government
sources before making decisions based on this.
"""

NATIONAL_LAWS = [
    ("Carrying ID", "Foreign tourists must carry their passport (with visa) at all times; Indian citizens should carry a government ID (Aadhaar/Voter ID/DL) when traveling, especially near border areas or protected monuments."),
    ("Photography at monuments", "Photography is generally allowed at ASI-protected monuments, but tripods, drones, and commercial shoots usually require prior permission. Interior photography is banned at many temples and the Taj Mahal's mausoleum chamber."),
    ("Alcohol", "The legal drinking age varies by state (18-25). Some states (e.g. Gujarat, Bihar, Nagaland, Mizoram, Lakshadweep) have full or partial prohibition, alcohol possession there can lead to fines or arrest."),
    ("Drones", "Flying a drone requires registration on the Digital Sky platform and permission in many areas, especially near airports, military zones, and protected/heritage sites. Unauthorized drone use near monuments like the Taj Mahal is a punishable offense."),
    ("Foreign currency & FCRA", "Carrying large amounts of undeclared foreign currency above set limits requires customs declaration on arrival."),
    ("Religious site conduct", "Many temples restrict entry for non-Hindus in inner sanctums (e.g. Kashi Vishwanath's inner shrine has specific rules); leather items are often prohibited inside temple premises."),
    ("Plastic bans", "Several states and heritage zones (including around the Taj Mahal) have single-use plastic bans; carrying banned plastic items can result in fines."),
]

STATE_LAWS = {
    "Uttar Pradesh": [
        "Alcohol is legal but regulated; sale hours and 'dry days' apply around elections and select festivals.",
        "Around the Taj Mahal and other ASI monuments, food, tobacco, and single-use plastics are banned inside the complex.",
        "Photography restrictions apply inside the main mausoleum of the Taj Mahal.",
    ],
    "Delhi": [
        "Alcohol is sold through government-licensed shops; legal drinking age is 25 for hard liquor, 21 for beer/wine.",
        "Strict pollution-control rules apply to vehicles (odd-even scheme has been used during high-pollution periods); check current status if driving.",
        "Photography is restricted near government/defense buildings (e.g. Parliament, Rashtrapati Bhavan security zones).",
    ],
    "Rajasthan": [
        "Popular for heritage stays in old forts/palaces; several are privately run, follow property-specific rules on photography and dress code.",
        "Wildlife sanctuaries (Ranthambore, etc.) require permits and have vehicle/entry restrictions; off-road driving inside reserves is illegal.",
    ],
    "Goa": [
        "One of the most liberal alcohol policies in India, legal drinking age is 18, alcohol is cheap and widely available.",
        "Beach shacks and nightlife are regulated by local panchayat/tourism department rules on noise cutoffs (usually by 10 PM in many areas).",
        "Drug laws are strictly enforced despite Goa's party reputation; possession of narcotics carries serious criminal penalties under the NDPS Act.",
    ],
    "Kerala": [
        "State-run liquor outlets exist but access can be limited; some districts observe dry days.",
        "Houseboat tourism on the backwaters is regulated, licensed operators are strongly recommended over informal ones.",
    ],
    "Tamil Nadu": [
        "Temple entry (e.g. Meenakshi Temple) often requires modest dress; shorts/sleeveless tops are commonly disallowed.",
        "Photography inside inner sanctums of major temples is typically prohibited.",
    ],
    "Maharashtra": [
        "Mumbai and other cities have licensing rules for late-night establishments; some venues need a special permit to stay open past 1:30 AM.",
        "An 'individual liquor permit' is technically required to consume alcohol in Maharashtra, though rarely enforced for short-term tourists.",
    ],
    "West Bengal": [
        "Sundarbans tourism (tiger reserve) requires forest department permits and licensed guides; unauthorized boat entry into core zones is illegal.",
    ],
    "Karnataka": [
        "Alcohol sale hours are regulated (typically until 11 PM-1 AM depending on establishment type and city).",
        "Wildlife areas like Bandipur/Nagarhole require permits and have vehicle movement restrictions, especially at night.",
    ],
    "Punjab": [
        "Border tourism (e.g. Wagah Border ceremony) has specific security screening and photography rules, follow BSF instructions on-site.",
    ],
}


def show_national_laws():
    print("\n=== National Tourist-Relevant Laws ===\n")
    for i, (title, desc) in enumerate(NATIONAL_LAWS, start=1):
        print(f"{i}. {title}")
        print(f"   {desc}\n")


def show_state_laws(state_name):
    laws = STATE_LAWS.get(state_name)
    if not laws:
        print(f"\nNo specific entries yet for '{state_name}'. Showing national laws only.")
        return
    print(f"\n=== {state_name}: Additional State-Specific Notes ===\n")
    for law in laws:
        print(f"  - {law}")
    print()


def choose_state():
    states = list(STATE_LAWS.keys())
    print("\nChoose a state for statewise law details:")
    for i, state in enumerate(states, start=1):
        print(f"  {i}. {state}")
    choice = input(f"Enter number (1-{len(states)}): ").strip()
    if choice.isdigit() and 1 <= int(choice) <= len(states):
        return states[int(choice) - 1]
    print("Invalid choice.")
    return None


if __name__ == "__main__":
    print("NOTE: This is general information for travelers, not legal advice.")
    print("Laws change over time -- verify with official sources before relying on this.\n")

    show_national_laws()

    state = choose_state()
    if state:
        show_state_laws(state)