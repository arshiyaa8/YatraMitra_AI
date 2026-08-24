import os
import base64
import requests

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "sk_9tcl8y8b_LciOv3SnG48FmIeQnE8sTMU5")
HEADERS = {"api-subscription-key": SARVAM_API_KEY}

def speech_to_text(audio_file_path: str, language_code: str = "hi-IN") -> str:
    """Converts recorded audio to text using Sarvam Saaras API."""
    url = "https://api.sarvam.ai/speech-to-text"
    with open(audio_file_path, "rb") as file:
        files = {"file": file}
        data = {"model": "saaras:v3", "language_code": language_code}
        response = requests.post(url, headers=HEADERS, files=files, data=data)
        
    if response.status_code == 200:
        return response.json().get("transcript", "")
    else:
        raise Exception(f"STT Error: {response.text}")

def translate_text(text: str, target_lang: str, source_lang: str = "auto") -> str:
    """Translates text across Indian languages using Sarvam Mayura API."""
    url = "https://api.sarvam.ai/translate"
    payload = {
        "input": text,
        "source_language_code": source_lang,
        "target_language_code": target_lang,
        "model": "mayura:v1"
    }
    response = requests.post(url, headers=HEADERS, json=payload)
    if response.status_code == 200:
        return response.json().get("translated_text", "")
    else:
        raise Exception(f"Translation Error: {response.text}")

def text_to_speech(text: str, target_lang: str = "hi-IN", output_path: str = "response.wav"):
    """Converts text to speech audio using Sarvam Bulbul API."""
    url = "https://api.sarvam.ai/text-to-speech"
    payload = {
        "inputs": [text],
        "target_language_code": target_lang,
        "speaker": "meera",
        "model": "bulbul:v1"
    }
    response = requests.post(url, headers=HEADERS, json=payload)
    if response.status_code == 200:
        audio_content = base64.b64decode(response.json()["audios"][0])
        with open(output_path, "wb") as f:
            f.write(audio_content)
        return output_path
    else:
        raise Exception(f"TTS Error: {response.text}")

def run_voice_assistant(audio_input_path: str, user_lang: str = "hi-IN", response_lang: str = "hi-IN"):
    """Pipeline: Audio Input -> Text -> Translation -> Response Speech."""
    print("Transcribing audio input...")
    user_query = speech_to_text(audio_input_path, language_code=user_lang)
    print(f"User Query: {user_query}")
    
    # Translate query to English for internal processing if needed
    query_in_en = translate_text(user_query, target_lang="en-IN", source_lang=user_lang)
    print(f"Translated to EN: {query_in_en}")
    
    # Sample logic output (Replace with actual tourism route/law search logic)
    bot_reply_en = f"Here is the travel guide for your query: {query_in_en}"
    
    # Translate back to user's desired output language
    final_reply = translate_text(bot_reply_en, target_lang=response_lang, source_lang="en-IN")
    
    # Generate Voice Output
    audio_output = text_to_speech(final_reply, target_lang=response_lang)
    return final_reply, audio_output