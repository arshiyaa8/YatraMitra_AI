"""Emergency / SOS signal detection (multilingual, best-effort, zero-dependency)."""

import re
from typing import Any, Dict, Iterable, List, Union

from .models import ChatMessage

_EMERGENCY_PATTERNS: List[re.Pattern] = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"\bsos\b",
        r"\bhelp me\b",
        r"\bhelp!",
        r"\bemergency\b",
        r"\bi(?:'m| am)? ?lost\b",
        r"\bi (?:feel|am) unsafe\b",
        r"\bi need help\b",
        r"\bnot safe\b",
        r"\b(robbed|theft|stolen|mugged)\b",
        r"\bharass(?:ed|ment)\b",
        r"\baccident\b",
        r"\bambulance\b",
        r"\bfire\b.*\b(help|building|hotel)\b",
        r"\b(earthquake|flood|landslide|cyclone|tsunami)\b",
        r"बचाओ|मदद चाहिए|मैं खो गया|खतरा|आपातकाल",
        r"உதவி|அவசர",
        r"సహాయం|అత్యవసర",
        r"সাহায্য|জরুরি",
        r"मदत|आणीबाणी",
        r"મદદ|કટોકટી",
        r"ਮਦਦ|ਐਮਰਜੈਂਸੀ",
        r"ಸಹಾಯ|ತುರ್ತು",
        r"സഹായ|അടിയന്തര",
    ]
]


def detect_emergency(text: str) -> bool:
    """True when a single utterance carries a safety/SOS signal."""
    if not text:
        return False
    return any(p.search(text) for p in _EMERGENCY_PATTERNS)


def conversation_has_emergency(
    messages: Iterable[Union[ChatMessage, Dict[str, Any]]], lookback: int = 2
) -> bool:
    """True when any of the last `lookback` user turns carries a safety signal."""
    user_turns = []
    for m in messages:
        role = m.role if isinstance(m, ChatMessage) else m.get("role")
        content = m.content if isinstance(m, ChatMessage) else m.get("content", "")
        if role == "user":
            user_turns.append(content)
    return any(detect_emergency(t) for t in user_turns[-lookback:])
