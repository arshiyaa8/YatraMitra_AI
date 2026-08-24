"""
main.py — Terminal CLI Hub for Tourism ML Engines & Multilingual Voice Pipeline

Provides interactive terminal menus for monument recommendation, laws and etiquette,
regional food culture, translation, and Sarvam AI voice assistant processing.
"""

import os
import recommend
import laws
import culture
import food
import translate
from voice_assistant import run_voice_pipeline


def voice_assistant_menu():
    print("\n--- VOICE ASSISTANT SETUP ---")
    audio_path = input("Enter path to your recorded WAV file (e.g., sample.wav): ").strip()
    
    if not os.path.exists(audio_path):
        print(f"❌ Error: File '{audio_path}' not found!")
        return
        
    print("\nSupported Sarvam Languages: hi-IN (Hindi), ta-IN (Tamil), te-IN (Telugu), bn-IN (Bengali), mr-IN (Marathi), en-IN (English)")
    lang_code = input("Enter language code [default: hi-IN]: ").strip() or "hi-IN"
    location = input("Enter target location/city [default: Delhi]: ").strip() or "Delhi"
    
    try:
        print("\nProcessing voice assistant pipeline...")
        response_text, audio_output = run_voice_pipeline(
            input_audio_path=audio_path,
            user_lang=lang_code,
            location=location
        )
        print(f"\n🤖 Assistant Response Text: {response_text}")
        print(f"🔊 Response Audio Saved To: {audio_output}")
    except Exception as e:
        print(f"\n❌ Voice Assistant Error: {e}")


def main_menu():
    while True:
        print("\n" + "=" * 50)
        print("UP TOURISM APP -- MAIN MENU")
        print("=" * 50)
        print("1. Search & recommend monuments")
        print("2. India laws (national + statewise)")
        print("3. Indian culture (general + statewise)")
        print("4. Indian food (general + statewise)")
        print("5. Translate text (Sarvam API)")
        print("6. Voice Travel Assistant (Groq + Sarvam)")
        print("7. Exit")

        choice = input("\nEnter your choice (1-7): ").strip()

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
            voice_assistant_menu()
        elif choice == "7":
            print("Goodbye!")
            break
        else:
            print("Invalid choice, try again.")


if __name__ == "__main__":
    main_menu()