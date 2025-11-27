from fastapi import APIRouter

from app.schemas import ChatRequest, ChatResponse
from app.services.gemini import gemini_service
from app.services.voicevox import voicevox_service

router = APIRouter(prefix='/api', tags=['chat'])


@router.post('/chat', response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
  data = gemini_service.chat(payload)
  
  # 使用 VOICEVOX 生成 AI 回复的音频
  if 'reply' in data:
    try:
      data['audioBase64'] = await voicevox_service.tts(data['reply'])
    except Exception as e:
      print(f"VOICEVOX TTS generation failed in chat: {e}")
      # 即使 TTS 失败也继续返回文本响应
      data['audioBase64'] = None
  
  return ChatResponse.model_validate(data)
