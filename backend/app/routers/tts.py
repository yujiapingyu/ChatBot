from fastapi import APIRouter

from app.schemas import TtsRequest, TtsResponse
from app.services.gemini import gemini_service

router = APIRouter(prefix='/api', tags=['tts'])


@router.post('/tts', response_model=TtsResponse)
async def synthesize(payload: TtsRequest) -> TtsResponse:
  audio = gemini_service.tts(payload.text)
  return TtsResponse(audioBase64=audio)
