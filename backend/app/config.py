from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
  google_api_key: str
  chat_model: str = 'gemini-2.0-flash-exp'
  tts_model: str = 'gemini-2.5-flash-preview-tts'
  cors_origins: list[str] = ['http://localhost:5173']

  class Config:
    env_file = '.env'
    env_file_encoding = 'utf-8'


@lru_cache
def get_settings() -> Settings:
  return Settings()
