"""
Server-side assistant engine.

Builds the message stack (system prompt + runtime context + history) and talks to
an OpenAI-compatible chat endpoint. Never expose the API key to the browser.
"""

import json
import os
from typing import Any, Dict, Iterator, List, Optional, Union

import httpx

from .config import AI_GATEWAY_CHAT_URL, ASSISTANT_MODEL
from .models import AssistantContext, ChatMessage
from .prompt import YATRAMITRA_SYSTEM_PROMPT, build_context_prompt
from .safety import conversation_has_emergency

MessageLike = Union[ChatMessage, Dict[str, Any]]


class AssistantError(Exception):
    """Gateway/model failure. `retryable` is True only for 429 and 5xx."""

    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message
        self.retryable = status == 429 or status >= 500


def _normalize(messages: List[MessageLike]) -> List[Dict[str, str]]:
    out = []
    for m in messages:
        d = m.to_dict() if isinstance(m, ChatMessage) else dict(m)
        if d.get("role") != "system":  # app history must not smuggle system turns
            out.append({"role": d["role"], "content": d["content"]})
    return out


def build_messages(
    messages: List[MessageLike], context: Optional[AssistantContext] = None
) -> List[Dict[str, str]]:
    """system prompt -> runtime context -> conversation history."""
    ctx = context or AssistantContext()
    emergency = conversation_has_emergency(messages)
    return [
        {"role": "system", "content": YATRAMITRA_SYSTEM_PROMPT},
        {
            "role": "system",
            "content": build_context_prompt(
                language=ctx.language,
                location=ctx.location_dict(),
                weather=ctx.weather,
                preferences=ctx.preferences_dict(),
                emergency=emergency,
            ),
        },
        *_normalize(messages),
    ]


def _api_key() -> str:
    key = os.environ.get("LOVABLE_API_KEY") or os.environ.get("OPENAI_API_KEY")
    if not key:
        raise AssistantError(401, "AI is not configured.")
    return key


def _headers() -> Dict[str, str]:
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {_api_key()}",
        "X-Lovable-AIG-SDK": "python-httpx",
    }


def _raise_for_status(status: int, body: str) -> None:
    message = body
    try:
        parsed = json.loads(body)
        message = parsed.get("error", {}).get("message") or parsed.get("message") or body
    except Exception:
        pass
    if status == 429:
        message = message or "Too many requests right now. Please try again shortly."
    elif status == 402:
        message = message or "AI credits are exhausted for this workspace."
    elif status == 403:
        message = message or "AI access is blocked by workspace policy."
    raise AssistantError(status, message or f"AI request failed ({status}).")


def ask_assistant(
    messages: List[MessageLike],
    context: Optional[AssistantContext] = None,
    timeout: float = 120.0,
) -> str:
    """One-shot reply text (non-streaming)."""
    payload = {"model": ASSISTANT_MODEL, "messages": build_messages(messages, context)}
    with httpx.Client(timeout=timeout) as client:
        res = client.post(AI_GATEWAY_CHAT_URL, headers=_headers(), json=payload)
        if res.status_code >= 400:
            _raise_for_status(res.status_code, res.text)
        data = res.json()
    return (data.get("choices") or [{}])[0].get("message", {}).get("content", "")


def stream_assistant(
    messages: List[MessageLike],
    context: Optional[AssistantContext] = None,
    timeout: float = 300.0,
) -> Iterator[str]:
    """Yields text deltas as they arrive — feed straight into your SSE/WebSocket."""
    payload = {
        "model": ASSISTANT_MODEL,
        "messages": build_messages(messages, context),
        "stream": True,
    }
    with httpx.Client(timeout=timeout) as client:
        with client.stream(
            "POST", AI_GATEWAY_CHAT_URL, headers=_headers(), json=payload
        ) as res:
            if res.status_code >= 400:
                _raise_for_status(res.status_code, res.read().decode("utf-8", "ignore"))
            for line in res.iter_lines():
                if not line or not line.startswith("data:"):
                    continue
                chunk = line[5:].strip()
                if chunk == "[DONE]":
                    break
                try:
                    delta = json.loads(chunk)["choices"][0].get("delta", {})
                except Exception:
                    continue
                piece = delta.get("content")
                if piece:
                    yield piece
