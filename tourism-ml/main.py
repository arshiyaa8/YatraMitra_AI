"""
main.py -- Central menu hub for the ym-tourism-ml project.
Run this to access all features from one place (stands in for website
buttons until the frontend is connected).
"""
import recommend
import laws
import culture
import food
import translate


def main_menu():
    while True:
        print("\n" + "=" * 50)
        print("UP TOURISM APP -- MAIN MENU")
        print("=" * 50)
        print("1. Search & recommend monuments")
        print("2. India laws (national + statewise)")
        print("3. Indian culture (general + statewise)")
        print("4. Indian food (general + statewise)")
        print("5. Translate text")
        print("6. Exit")

        choice = input("\nEnter your choice (1-6): ").strip()

        if choice == "1":
            recommend.search_and_view()
        elif choice == "2":
            laws.show_national_laws()
            state = laws.choose_state()
            if state:
                laws.show_state_laws(state)
        elif choice == "3":
            culture.show_general_culture()
            culture.choose_state_culture()
        elif choice == "4":
            food.show_general_food()
            food.choose_state_food()
        elif choice == "5":
            text_to_translate = input("Enter text to translate: ")
            target = translate.choose_language()
            try:
                result = translate.translate(text_to_translate, target_lang=target)
                print(f"\nTranslated ({target}): {result}")
            except Exception as e:
                print(f"\nTranslation failed: {e}")
        elif choice == "6":
            print("Goodbye!")
            break
        else:
            print("Invalid choice, try again.")


if __name__ == "__main__":
    main_menu()