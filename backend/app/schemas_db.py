from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# Session schemas
class SessionCreate(BaseModel):
    title: str = "新的对话"
    conversation_style: str = "casual"


class SessionTitleUpdate(BaseModel):
    title: str


class SessionResponse(BaseModel):
    id: str
    title: str
    conversation_style: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Message schemas
class MessageCreate(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str
    translation: Optional[str] = None
    feedback: Optional[dict] = None
    audio_base64: Optional[str] = None


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    translation: Optional[str] = None
    feedback: Optional[dict] = None
    audio_base64: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Favorite schemas
class FavoriteCreate(BaseModel):
    text: str
    translation: Optional[str] = None
    source: str  # 'reply', 'feedback', 'selection'


class FavoriteUpdate(BaseModel):
    mastery: Optional[str] = None
    review_count: Optional[int] = None
    last_reviewed_at: Optional[datetime] = None


class FavoriteResponse(BaseModel):
    id: str
    text: str
    translation: Optional[str] = None
    source: str
    mastery: str
    review_count: int
    created_at: datetime
    last_reviewed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Session with messages
class SessionWithMessages(SessionResponse):
    messages: List[MessageResponse] = []

    class Config:
        from_attributes = True
