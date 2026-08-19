"""Sarvam AI voice helpers (STT / Translate / TTS). Requires SARVAM_API_KEY."""

import os
from typing import Any, Dict, List, Optional, Tuple

import httpx

from .config import SARVAM


def _key() -> str:
    key = os.environ.get("sk_qx68e1e3_b2bkKcoSdV9DL6b7axCAOM2Z")
    if not key:
        raise RuntimeError("Voice services are not configured.")
    return key


def _handle(res: httpx.Response) -> Dict[str, Any]:
    if res.status_code >= 400:
        raise RuntimeError(res.text or f"Voice service failed ({res.status_code}).")
    return res.json()


def speech_to_text(
    audio_bytes: bytes,
    language_code: str = "unknown",
    filename: str = "audio.wav",
    timeout: float = 60.0,
) -> Tuple[str, Optional[str]]:
    """Transcribe speech in its own language. Returns (transcript, detected_language)."""
    files = {"file": (filename, audio_bytes, "audio/wav")}
    data = {"model": SARVAM["default_stt_model"], "language_code": language_code}
    with httpx.Client(timeout=timeout) as client:
        payload = _handle(
            client.post(
                SARVAM["stt"], headers={"api-subscription-key": _key()}, files=files, data=data
            )
        )
    return payload.get("transcript", ""), payload.get("language_code")


def speech_to_text_translate(
    audio_bytes: bytes, filename: str = "audio.wav", timeout: float = 60.0
) -> Tuple[str, Optional[str]]:
    """Transcribe any Indian language directly into English text."""
    files = {"file": (filename, audio_bytes, "audio/wav")}
    data = {"model": SARVAM["default_stt_translate_model"]}
    with httpx.Client(timeout=timeout) as client:
        payload = _handle(
            client.post(
                SARVAM["stt_translate"],
                headers={"api-subscription-key": _key()},
                files=files,
                data=data,
            )
        )
    return payload.get("transcript", ""), payload.get("language_code")


def translate_text(
    text: str,
    target_language_code: str,
    source_language_code: str = "auto",
    timeout: float = 60.0,
) -> str:
    with httpx.Client(timeout=timeout) as client:
        payload = _handle(
            client.post(
                SARVAM["translate"],
                headers={"api-subscription-key": _key()},
                json={
                    "input": text,
                    "source_language_code": source_language_code,
                    "target_language_code": target_language_code,
                    "model": SARVAM["default_translate_model"],
                },
            )
        )
    return payload.get("translated_text", "")


def text_to_speech(
    text: str,
    target_language_code: str,
    speaker: Optional[str] = None,
    timeout: float = 60.0,
) -> List[str]:
    """Returns base64-encoded WAV chunks ready to play in the browser."""
    with httpx.Client(timeout=timeout) as client:
        payload = _handle(
            client.post(
                SARVAM["tts"],
                headers={"api-subscription-key": _key()},
                json={
                    "text": text,
                    "target_language_code": target_language_code,
                    "speaker": speaker or SARVAM["default_speaker"],
                    "model": SARVAM["default_tts_model"],
                },
            )
        )
    return payload.get("audios", [])
