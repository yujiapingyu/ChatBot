from fastapi import APIRouter

from app.schemas import TitleRequest, TitleResponse
from app.services.gemini import gemini_service

router = APIRouter(prefix='/api', tags=['title'])


@router.post('/title', response_model=TitleResponse)
async def summarize(payload: TitleRequest) -> TitleResponse:
  title = gemini_service.title(payload.transcript)
  return TitleResponse(title=title)
