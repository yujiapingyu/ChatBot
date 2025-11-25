from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field


class Message(BaseModel):
  role: Literal['user', 'assistant']
  content: str


ConversationStyle = Literal['casual', 'formal']


class ChatRequest(BaseModel):
  session_id: str = Field(..., alias='sessionId')
  messages: list[Message]
  style: ConversationStyle = 'casual'


class Feedback(BaseModel):
  correctedSentence: str
  explanation: str
  naturalnessScore: int


class ChatResponse(BaseModel):
  reply: str
  replyTranslation: str
  feedback: Feedback
  audioBase64: str | None = None


class TtsRequest(BaseModel):
  text: str


class TtsResponse(BaseModel):
  audioBase64: str


class TitleRequest(BaseModel):
  transcript: str


class TitleResponse(BaseModel):
  title: str
