"""Shared data structures — the stable contract between frontend and backend."""

from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Literal, Optional

ChatRole = Literal["system", "user", "assistant"]
CrowdLevel = Literal["Very Low", "Low", "Moderate", "High", "Very High"]


@dataclass
class ChatMessage:
    role: ChatRole
    content: str

    def to_dict(self) -> Dict[str, str]:
        return {"role": self.role, "content": self.content}

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> "ChatMessage":
        return ChatMessage(role=data["role"], content=data["content"])


@dataclass
class GeoLocation:
    lat: Optional[float] = None
    lng: Optional[float] = None
    label: Optional[str] = None


@dataclass
class AssistantPreferences:
    language: Optional[str] = None
    destination: Optional[str] = None
    interests: List[str] = field(default_factory=list)
    accessibility: List[str] = field(default_factory=list)
    dietary: List[str] = field(default_factory=list)
    budget: Optional[str] = None


@dataclass
class AssistantContext:
    language: Optional[str] = None
    location: Optional[GeoLocation] = None
    weather: Optional[str] = None
    preferences: Optional[AssistantPreferences] = None

    @staticmethod
    def from_dict(data: Optional[Dict[str, Any]]) -> "AssistantContext":
        data = data or {}
        loc = data.get("location")
        prefs = data.get("preferences")
        return AssistantContext(
            language=data.get("language"),
            location=GeoLocation(**loc) if isinstance(loc, dict) else None,
            weather=data.get("weather"),
            preferences=AssistantPreferences(**prefs) if isinstance(prefs, dict) else None,
        )

    def location_dict(self) -> Optional[Dict[str, Any]]:
        return asdict(self.location) if self.location else None

    def preferences_dict(self) -> Optional[Dict[str, Any]]:
        if not self.preferences:
            return None
        return {k: v for k, v in asdict(self.preferences).items() if v}


@dataclass
class AssistantReply:
    text: str
    emergency: bool
    language: Optional[str] = None
