"""
culture.py -- Detailed cultural information about India, both general
and statewise, for tourists.
"""

GENERAL_CULTURE = [
    ("Greetings", "The traditional greeting is 'Namaste' -- palms pressed together at chest level with a slight bow. Handshakes are common in urban/business settings, but many older or more traditional people still prefer Namaste."),
    ("Dress norms", "Modesty is valued, especially at religious sites, shoulders and knees are often expected to be covered. Removing shoes before entering homes, temples, and mosques is standard practice."),
    ("Right hand usage", "The right hand is traditionally used for eating, giving/receiving objects, and greetings; the left hand is considered unclean in many contexts."),
    ("Festivals", "India has an extremely dense festival calendar; major pan-India festivals include Diwali (festival of lights), Holi (festival of colors), Eid, and Christmas, alongside hundreds of regional festivals."),
    ("Joint family structure", "Multi-generational households remain common, particularly outside metro cities, with strong emphasis on family hierarchy and respect for elders."),
    ("Religious diversity", "India is home to Hinduism, Islam, Christianity, Sikhism, Buddhism, Jainism, and Zoroastrianism (among Parsis), with deep regional variation in how each is practiced."),
    ("Public displays of affection", "Generally more conservative than Western norms, especially outside major metro cities; handholding is common but kissing in public is frowned upon in most places."),
]

STATE_CULTURE = {
    "Uttar Pradesh": "Deeply linked to both Hindu and Islamic heritage -- Varanasi is one of the world's oldest continuously inhabited cities and a major Hindu pilgrimage center, while Lucknow's Nawabi culture gave rise to refined Awadhi etiquette, Urdu poetry, and Kathak dance. Ayodhya and Mathura are major Hindu religious centers tied to Rama and Krishna respectively.",
    "Rajasthan": "Known for its Rajput warrior heritage, elaborate havelis (mansions), vibrant turbans and mirror-work textiles, and folk music/dance traditions like Ghoomar. Puppet shows (kathputli) and desert festivals are notable cultural exports.",
    "Kerala": "Home to classical art forms like Kathakali (elaborately costumed dance-drama) and Mohiniyattam, Ayurveda originated and is still widely practiced here, and it has among India's highest literacy rates with a strong matrilineal tradition in some communities.",
    "Tamil Nadu": "One of the oldest continuous cultures in the world, centered on Dravidian architecture (massive temple gopurams), Bharatanatyam classical dance, and Tamil literature/poetry dating back over 2,000 years.",
    "West Bengal": "Renowned for its intellectual and artistic heritage -- Rabindranath Tagore's literary legacy, Durga Puja (its biggest festival, a UNESCO-recognized cultural event), and a strong tradition in film, art, and left-leaning political discourse.",
    "Punjab": "Sikh culture is central here, with the Golden Temple in Amritsar as its spiritual heart; known for Bhangra dance/music, hearty Punjabi cuisine, and a strong tradition of hospitality ('Punjabi Wedding' culture is often loud, colorful, and elaborate).",
    "Goa": "A blend of Indian and Portuguese colonial heritage (Goa was a Portuguese colony until 1961), reflected in its architecture, Konkani language, Catholic churches alongside Hindu temples, and a laid-back beach-and-festival culture.",
    "Gujarat": "Known for Garba/Dandiya folk dance (especially during Navratri), a strong business/entrepreneurial culture, vibrant textile traditions (bandhani tie-dye), and predominantly vegetarian food culture.",
}


def show_general_culture():
    print("\n=== General Indian Culture ===\n")
    for i, (title, desc) in enumerate(GENERAL_CULTURE, start=1):
        print(f"{i}. {title}")
        print(f"   {desc}\n")


def choose_state_culture():
    states = list(STATE_CULTURE.keys())
    print("Choose a state for detailed culture notes:")
    for i, state in enumerate(states, start=1):
        print(f"  {i}. {state}")
    choice = input(f"Enter number (1-{len(states)}): ").strip()
    if choice.isdigit() and 1 <= int(choice) <= len(states):
        state = states[int(choice) - 1]
        print(f"\n=== {state} Culture ===\n{STATE_CULTURE[state]}\n")
    else:
        print("Invalid choice.")


if __name__ == "__main__":
    show_general_culture()
    choose_state_culture()