from __future__ import annotations

import base64
import json
import struct
from typing import Any

import google.generativeai as genai
from fastapi import HTTPException, status

from app.config import get_settings
from app.schemas import ChatRequest

settings = get_settings()
genai.configure(api_key=settings.google_api_key)

CHAT_SCHEMA: dict[str, Any] = {
  'type': 'object',
  'properties': {
    'reply': {'type': 'string'},
    'replyTranslation': {'type': 'string'},
    'feedback': {
      'type': 'object',
      'properties': {
        'correctedSentence': {'type': 'string'},
        'explanation': {'type': 'string'},
        'naturalnessScore': {'type': 'integer'},
      },
      'required': ['correctedSentence', 'explanation', 'naturalnessScore'],
    },
    'audioBase64': {'type': 'string'},
  },
  'required': ['reply', 'replyTranslation', 'feedback'],
}

STYLE_PROMPTS = {
  'casual': '使用亲切、自然的日常会话语气，就像和朋友聊天，适度加入鼓励或追问。',
  'formal': '使用礼貌、正式的敬语表达，句式严谨，适合商务、面试或考试场景。',
}

_SYSTEM_PROMPT = """你是专业日语老师。请严格遵守JSON格式要求：

【关键原则】
1. reply 是你对用户最新发言的自然回应（如果用户提问就回答，如果陈述就延续话题）
2. feedback 仅评估"用户的原句"，与你的 reply 完全独立

【输出字段说明】
- feedback.correctedSentence: 
  * 针对用户原句的修正版本
  * 评估标准：语法正确性 + 当前场景适配度 + 日本人常用表达
  * 如果用户原句在当前场景下已经完美，保持原样；否则必须修正
- feedback.explanation: 
  * 严格使用日文说明修改原因（语法/礼貌度/自然度/场景匹配等），禁止对单词进行假名注音
  * 如果无需修改，简要说明"在XXX场景下表达恰当"
- feedback.naturalnessScore: 
  * 0-100整数，评估用户原句在当前场景下的表现
  * 评分维度：语法(30%) + 场景匹配度(40%) + 自然流畅度(30%)
  * 示例：casual场景说敬语→扣场景分；formal场景用俗语→扣场景分
- reply: 纯日语回应（仅假名+汉字，禁止罗马音/英文）
- replyTranslation: reply 的中文翻译

【禁止行为】
- 禁止在 feedback 中评论或修改你自己的 reply
- 禁止输出 JSON 以外的任何文字
"""

TITLE_PROMPT = (
  '请基于以下对话内容生成 20 个字以内的日语标题。严格要求：\n'
  '1. 只输出一个纯日语标题（仅包含汉字、假名）。\n'
  '2. 禁止包含罗马音、英文、标点符号。\n'
  '3. 禁止列举多个选项。\n'
  '4. 禁止添加任何前缀（如“标题：”）。\n'
  '对话内容：\n'
)

def add_wav_header(pcm_data: bytes, sample_rate: int = 24000, channels: int = 1, sample_width: int = 2) -> bytes:
  header = b'RIFF'
  header += struct.pack('<I', 36 + len(pcm_data))
  header += b'WAVE'
  header += b'fmt '
  header += struct.pack('<I', 16)
  header += struct.pack('<H', 1)
  header += struct.pack('<H', channels)
  header += struct.pack('<I', sample_rate)
  header += struct.pack('<I', sample_rate * channels * sample_width)
  header += struct.pack('<H', channels * sample_width)
  header += struct.pack('<H', sample_width * 8)
  header += b'data'
  header += struct.pack('<I', len(pcm_data))
  return header + pcm_data

class GeminiService:
  def __init__(self) -> None:
    self.chat_model = genai.GenerativeModel(settings.chat_model)
    self.tts_model = genai.GenerativeModel(settings.tts_model)
    self.title_model = genai.GenerativeModel(settings.chat_model)

  def _safe_json(self, response: genai.types.GenerationResponse) -> dict[str, Any]:
    try:
      content = response.text or ''
      return json.loads(content)
    except (json.JSONDecodeError, AttributeError) as exc:
      raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail='AI 返回格式错误') from exc

  def chat(self, payload: ChatRequest) -> dict[str, Any]:
    messages_text = '\n'.join([f"{msg.role}: {msg.content}" for msg in payload.messages])
    last_user_message = next((msg.content for msg in reversed(payload.messages) if msg.role == 'user'), '')
    style_hint = STYLE_PROMPTS.get(payload.style, STYLE_PROMPTS['casual'])
    prompt = (
      f"{_SYSTEM_PROMPT}\n风格设定：{style_hint}\n\n用户上一句：{last_user_message}\n\n"
      f"对话记录（供参考，可精简使用）：\n{messages_text}"
    )
    response = self.chat_model.generate_content(
      contents=[
        {'role': 'user', 'parts': [{'text': prompt}]},
      ],
      generation_config={
        'response_mime_type': 'application/json',
        'response_schema': CHAT_SCHEMA,
      },
    )
    data = self._safe_json(response)
    return data

  def tts(self, text: str) -> str:
    try:
      response = self.tts_model.generate_content(
        contents=[{'role': 'user', 'parts': [{'text': text}]}],
        generation_config={
          'response_modalities': ['AUDIO']
        },
      )
    except Exception as e:
      print(f"Gemini TTS API Error: {e}")
      raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f'TTS API调用失败: {str(e)}')

    try:
      part = response.candidates[0].content.parts[0]
      if getattr(part, 'inline_data', None):
        raw_audio = part.inline_data.data
        # Gemini usually returns 24kHz mono 16-bit PCM
        wav_audio = add_wav_header(raw_audio)
        return base64.b64encode(wav_audio).decode('utf-8')
    except (IndexError, AttributeError) as exc:
      print(f"Gemini TTS Parse Error: {exc}")
      print(f"Response candidates: {response.candidates}")
      raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail='TTS 生成失败') from exc
    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail='未收到音频数据')

  def title(self, transcript: str) -> str:
    prompt = TITLE_PROMPT + transcript
    response = self.title_model.generate_content(
      [{'role': 'user', 'parts': [{'text': prompt}]}],
      generation_config={'response_mime_type': 'text/plain'},
    )
    text = (response.text or '').strip()
    candidate = text.splitlines()[0].strip(' ，。,.')
    trimmed = candidate[:20].strip()
    return trimmed or '新しい話題'



gemini_service = GeminiService()
