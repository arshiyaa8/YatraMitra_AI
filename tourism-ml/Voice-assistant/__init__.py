"""YatraMitra — India's multilingual voice tourism assistant (drop-in module)."""

from .config import (
    AI_GATEWAY_CHAT_URL,
    ASSISTANT_MODEL,
    ASSISTANT_NAME,
    EMERGENCY_NUMBERS,
    SARVAM,
    SUPPORTED_LANGUAGES,
)
from .engine import AssistantError, ask_assistant, build_messages, stream_assistant
from .models import (
    AssistantContext,
    AssistantPreferences,
    AssistantReply,
    ChatMessage,
    GeoLocation,
)
from .prompt import YATRAMITRA_SYSTEM_PROMPT, build_context_prompt
from .safety import conversation_has_emergency, detect_emergency
from .sarvam import (
    speech_to_text,
    speech_to_text_translate,
    text_to_speech,
    translate_text,
)

__all__ = [
    "YATRAMITRA_SYSTEM_PROMPT",
    "build_context_prompt",
    "ASSISTANT_NAME",
    "ASSISTANT_MODEL",
    "AI_GATEWAY_CHAT_URL",
    "SUPPORTED_LANGUAGES",
    "EMERGENCY_NUMBERS",
    "SARVAM",
    "ChatMessage",
    "GeoLocation",
    "AssistantContext",
    "AssistantPreferences",
    "AssistantReply",
    "detect_emergency",
    "conversation_has_emergency",
    "build_messages",
    "ask_assistant",
    "stream_assistant",
    "AssistantError",
    "speech_to_text",
    "speech_to_text_translate",
    "translate_text",
    "text_to_speech",
]
