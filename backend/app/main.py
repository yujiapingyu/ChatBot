from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import engine, Base
from app.routers import chat, tts, title, auth, sessions, favorites

settings = get_settings()

# 创建数据库表
Base.metadata.create_all(bind=engine)

app = FastAPI(title='Kokoro Coach API', version='0.1.0')

app.add_middleware(
  CORSMiddleware,
  allow_origins=settings.cors_origins,
  allow_headers=['*'],
  allow_credentials=True,
  allow_methods=['*'],
)

app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(favorites.router)
app.include_router(chat.router)
app.include_router(tts.router)
app.include_router(title.router)


@app.get('/health')
async def health() -> dict[str, str]:
  return {'status': 'ok'}
