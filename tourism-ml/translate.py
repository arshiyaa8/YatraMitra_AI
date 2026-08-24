"""
translate.py — Multilingual Translation CLI & Sarvam AI Integration

Provides terminal-based multilingual translation for Indian scheduled languages
and major foreign languages, supporting regional speech localization.
"""

import os
from sarvamai import SarvamAI

SARVAM_API_KEY = os.environ.get("SARVAM_API_KEY", "")
client = SarvamAI(api_subscription_key=SARVAM_API_KEY) if SARVAM_API_KEY else None


# 10 common Indian languages
INDIAN_LANGUAGES = {
    "1": ("Hindi", "hi"),
    "2": ("Tamil", "ta"),
    "3": ("Telugu", "te"),
    "4": ("Bengali", "bn"),
    "5": ("Marathi", "mr"),
    "6": ("Gujarati", "gu"),
    "7": ("Kannada", "kn"),
    "8": ("Malayalam", "ml"),
    "9": ("Punjabi", "pa"),
    "10": ("Odia", "or"),
}

# 10 common languages for foreign tourists visiting India
# NOTE: Sarvam AI's translate API is built for Indian languages (source/target
# codes use the "-IN" region suffix). Not all of these codes are guaranteed
# to be supported -- see the note printed at runtime if a call fails.
FOREIGN_LANGUAGES = {
    "1": ("English", "en"),
    "2": ("French", "fr"),
    "3": ("German", "de"),
    "4": ("Spanish", "es"),
    "5": ("Russian", "ru"),
    "6": ("Chinese (Mandarin)", "zh"),
    "7": ("Japanese", "ja"),
    "8": ("Korean", "ko"),
    "9": ("Arabic", "ar"),
    "10": ("Portuguese", "pt"),
}


# Indian language codes Sarvam expects with a "-IN" region suffix (e.g. "hi-IN").
# Non-Indian languages are passed as-is, since Sarvam's translate API is built
# around Indian regional languages and may not support every foreign code below --
# if a foreign-language call fails, that's why (see the try/except at the bottom).
INDIAN_CODE_SET = {code for _, code in INDIAN_LANGUAGES.values()}


def _format_lang_code(lang_code):
    """Add the '-IN' suffix only for Indian language codes."""
    if lang_code in INDIAN_CODE_SET or lang_code == "en":
        return f"{lang_code}-IN"
    return lang_code


def translate(text, target_lang, source_lang="en"):
    """
    Translate text using Sarvam AI. Returns the translated string.

    target_lang / source_lang: short codes like "hi", "ta", "en", "fr", "ja"
    """
    response = client.text.translate(
        input=text,
        source_language_code=_format_lang_code(source_lang),
        target_language_code=_format_lang_code(target_lang),
    )
    return response.translated_text


def choose_language():
    """Ask Indian vs Foreigner first, then show the matching 10-language menu."""
    print("\nAre you translating for:")
    print("  1. An Indian tourist")
    print("  2. A foreign tourist")
    category = input("Enter number (1 or 2): ").strip()

    languages = INDIAN_LANGUAGES if category == "1" else FOREIGN_LANGUAGES
    default_code = "hi" if category == "1" else "en"

    print("\nChoose a language:")
    for key, (name, code) in languages.items():
        print(f"  {key}. {name}")

    choice = input("Enter number (1-10): ").strip()
    if choice not in languages:
        print(f"Invalid choice, defaulting to {'Hindi' if category == '1' else 'English'}.")
        return default_code

    name, code = languages[choice]
    print(f"Selected: {name}")
    return code


if __name__ == "__main__":
    text_to_translate = input("Enter text to translate: ")
    target = choose_language()
    try:
        result = translate(text_to_translate, target_lang=target)
        print(f"\nTranslated ({target}): {result}")
    except Exception as e:
        print(f"\nTranslation failed for language code '{target}'.")
        print("Sarvam AI's translate API mainly supports Indian languages --")
        print("this foreign language code may not be supported yet.")
        print(f"Details: {e}")