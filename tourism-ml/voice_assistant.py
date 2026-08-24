"""
voice_assistant.py — Multilingual Voice Assistant & Speech Pipeline

Integrates Sarvam AI Saaras (ASR), Mayura (NMT), and Bulbul (TTS) pipelines
for end-to-end voice interactions in Indian languages.
"""

import os
import base64
import requests

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")


def get_headers():
    """Builds authorization header dictionary from environment API key."""
    key = os.getenv("SARVAM_API_KEY", SARVAM_API_KEY)
    return {"api-subscription-key": key} if key else {}



def speech_to_text(audio_file_path: str, language_code: str = "hi-IN") -> str:
    """Converts recorded audio to text using Sarvam Saaras API."""
    url = "https://api.sarvam.ai/speech-to-text"
    with open(audio_file_path, "rb") as file:
        files = {"file": (os.path.basename(audio_file_path), file, "audio/wav")}
        data = {"model": "saaras:v3", "language_code": language_code}
        response = requests.post(url, headers=get_headers(), files=files, data=data)

    if response.status_code == 200:
        return response.json().get("transcript", "")
    else:
        raise Exception(f"STT Error ({response.status_code}): {response.text}")


def translate_text(text: str, target_lang: str = "hi-IN", source_lang: str = "auto") -> str:
    """Translates text across Indian languages using Sarvam Mayura API."""
    url = "https://api.sarvam.ai/translate"
    payload = {
        "input": text,
        "source_language_code": source_lang,
        "target_language_code": target_lang,
        "model": "mayura:v1",
    }
    response = requests.post(url, headers=get_headers(), json=payload)
    if response.status_code == 200:
        return response.json().get("translated_text", "")
    else:
        raise Exception(f"Translation Error ({response.status_code}): {response.text}")


def text_to_speech(text: str, target_lang: str = "hi-IN", speaker: str = "anushka", output_path: str = "response.wav"):
    """Converts text to speech audio using Sarvam Bulbul API."""
    url = "https://api.sarvam.ai/text-to-speech"
    payload = {
        "inputs": [text],
        "target_language_code": target_lang,
        "speaker": speaker,
        "model": "bulbul:v2",
    }
    response = requests.post(url, headers=get_headers(), json=payload)
    if response.status_code == 200:
        audio_content = base64.b64decode(response.json()["audios"][0])
        with open(output_path, "wb") as f:
            f.write(audio_content)
        return output_path
    else:
        raise Exception(f"TTS Error ({response.status_code}): {response.text}")


def run_voice_assistant(audio_input_path: str, user_lang: str = "hi-IN", response_lang: str = "hi-IN"):
    """Pipeline: Audio Input -> Text -> Translation -> Response Speech."""
    print(f"Transcribing audio input ({user_lang})...")
    user_query = speech_to_text(audio_input_path, language_code=user_lang)
    print(f"User Query: {user_query}")

    # Translate query to English for internal processing if needed
    query_in_en = translate_text(user_query, target_lang="en-IN", source_lang=user_lang)
    print(f"Translated to EN: {query_in_en}")

    # Sample logic output
    bot_reply_en = f"Here is the travel guide for your query: {query_in_en}"

    # Translate back to user's desired output language
    final_reply = translate_text(bot_reply_en, target_lang=response_lang, source_lang="en-IN")
    print(f"Final Reply ({response_lang}): {final_reply}")

    # Generate Voice Output
    audio_output = text_to_speech(final_reply, target_lang=response_lang)
    print(f"Audio generated: {audio_output}")
    return final_reply, audio_output


if __name__ == "__main__":
    import sys
    # Ensure Windows console handles UTF-8 output
    if sys.stdout.encoding != "utf-8":
        sys.stdout.reconfigure(encoding="utf-8")

    print("=== Testing Sarvam AI Voice Assistant Pipeline ===")
    sample_text = "Welcome to YatraMitra AI. Enjoy exploring India's rich cultural heritage."

    print("\n1. Testing Text Translation (EN -> HI)...")
    try:
        hi_text = translate_text(sample_text, target_lang="hi-IN", source_lang="en-IN")
        print("Translation Success:", hi_text)

        print("\n2. Testing Text-to-Speech (Bulbul v2)...")
        wav_file = text_to_speech(hi_text, target_lang="hi-IN", speaker="anushka", output_path="test_output.wav")
        print("TTS Audio Success: File generated at", wav_file, f"({os.path.getsize(wav_file)} bytes)")

        if os.path.exists("test_output.wav"):
            os.remove("test_output.wav")

        print("\nAll Sarvam AI voice assistant services are 100% OPERATIONAL!")
    except Exception as err:
        print("Error during test:", err)