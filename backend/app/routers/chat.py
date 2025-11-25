from fastapi import APIRouter

from app.schemas import ChatRequest, ChatResponse
from app.services.gemini import gemini_service

router = APIRouter(prefix='/api', tags=['chat'])


@router.post('/chat', response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
  data = gemini_service.chat(payload)
  return ChatResponse.model_validate(data)
