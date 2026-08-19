"""Static configuration for the YatraMitra assistant."""

ASSISTANT_NAME = "YatraMitra"

# Chat model served through the Lovable AI Gateway (OpenAI-compatible).
ASSISTANT_MODEL = "google/gemini-2.5-flash"
AI_GATEWAY_CHAT_URL = "https://ai.gateway.lovable.dev/v1/chat/completions"

# Swap these two if you point the assistant at OpenAI/Anthropic/etc. instead.
# AI_GATEWAY_CHAT_URL = "https://api.openai.com/v1/chat/completions"
# ASSISTANT_MODEL = "gpt-4o-mini"

SUPPORTED_LANGUAGES = [
    {"code": "en-IN", "name": "English"},
    {"code": "hi-IN", "name": "Hindi"},
    {"code": "ta-IN", "name": "Tamil"},
    {"code": "te-IN", "name": "Telugu"},
    {"code": "bn-IN", "name": "Bengali"},
    {"code": "mr-IN", "name": "Marathi"},
    {"code": "gu-IN", "name": "Gujarati"},
    {"code": "pa-IN", "name": "Punjabi"},
    {"code": "kn-IN", "name": "Kannada"},
    {"code": "ml-IN", "name": "Malayalam"},
    {"code": "od-IN", "name": "Odia"},
    {"code": "as-IN", "name": "Assamese"},
    {"code": "ur-IN", "name": "Urdu"},
]

EMERGENCY_NUMBERS = {
    "all_in_one": "112",
    "police": "100",
    "ambulance": "108",
    "fire": "101",
    "tourist_helpline": "1363",
    "women_helpline": "1091",
    "disaster": "1078",
}

SARVAM = {
    "stt": "https://api.sarvam.ai/speech-to-text",
    "stt_translate": "https://api.sarvam.ai/speech-to-text-translate",
    "translate": "https://api.sarvam.ai/translate",
    "tts": "https://api.sarvam.ai/text-to-speech",
    "default_speaker": "anushka",
    "default_tts_model": "bulbul:v2",
    "default_stt_model": "saarika:v2.5",
    "default_stt_translate_model": "saaras:v2.5",
    "default_translate_model": "mayura:v1",
}
