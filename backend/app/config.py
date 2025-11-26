from functools import lru_cache
from typing import List, Union
from pathlib import Path
from pydantic import field_validator, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
  model_config = SettingsConfigDict(
    env_file='.env',
    env_file_encoding='utf-8',
  )
  
  google_api_key: str
  chat_model: str = 'gemini-2.0-flash-exp'
  tts_model: str = 'gemini-2.5-flash-preview-tts'
  cors_origins: Union[str, List[str]] = 'http://localhost:5173'
  
  # 数据库配置
  database_url: str = 'sqlite:///./chatbot.db'
  
  # JWT 配置
  secret_key: str = 'your-secret-key-change-in-production'
  algorithm: str = 'HS256'
  access_token_expire_minutes: int = 60 * 24 * 7  # 7 天
  
  # 邮箱白名单配置
  email_whitelist_file: str = 'email_whitelist.txt'

  @field_validator('cors_origins', mode='before')
  @classmethod
  def parse_cors_origins(cls, v) -> List[str]:
    if isinstance(v, str):
      # 支持逗号分隔的字符串
      return [origin.strip() for origin in v.split(',') if origin.strip()]
    elif isinstance(v, list):
      # 如果已经是列表，直接返回
      return v
    return [str(v)]


@lru_cache
def get_settings() -> Settings:
  return Settings()


def get_email_whitelist() -> List[str]:
  """从文件中读取邮箱白名单，支持热更新"""
  settings = get_settings()
  whitelist_file = Path(settings.email_whitelist_file)
  
  if not whitelist_file.exists():
    # 如果文件不存在，创建默认白名单
    whitelist_file.write_text('2507490921@qq.com\n', encoding='utf-8')
  
  try:
    content = whitelist_file.read_text(encoding='utf-8')
    # 读取非空行，去除空格和注释
    whitelist = [
      line.strip() 
      for line in content.splitlines() 
      if line.strip() and not line.strip().startswith('#')
    ]
    return whitelist
  except Exception:
    # 出错时返回默认白名单
    return ['2507490921@qq.com']
