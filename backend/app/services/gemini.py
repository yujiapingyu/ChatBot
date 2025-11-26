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

_SYSTEM_PROMPT = """你是专业日语老师。请严格遵守JSON格式要求。

【任务定义】
你需要并行处理两个独立任务：
1. **Feedback (影子模式)**：作为用户的"润色编辑器"。保留用户的意图和视角，仅提升表达的地道程度和礼貌度。
2. **Reply (对话模式)**：作为用户的"对话伙伴"。针对用户的内容进行正常的日语回复。

【Few-Shot 顽固案例纠正 (严格参照)】
在此学习如何处理容易出错的边缘情况：

Case 1: 用户陈述事实 (禁止把陈述句改成疑问句)
User: "悲しい" (我好难过)
❌ Bad Feedback: "悲しいですか？" (你难过吗？ -> 错误：视角变成了AI)
✅ Good Feedback: "今日は少し落ち込んでいます。" (补全主语，保留第一人称陈述)

Case 2: 用户提问 (禁止在Feedback中回答问题)
User: "トイレどこ？" (厕所在哪？)
❌ Bad Feedback: "突き当たりを右です。" (回答问题 -> 错误：Feedback不是回答)
✅ Good Feedback: "すみません、お手洗いはどちらでしょうか？" (润色提问，保留疑问意图)

Case 3: 用户仅输入单词 (需补全为完整句子)
User: "水" (水)
❌ Bad Feedback: "水ですね。" (确认 -> 错误：这是废话)
✅ Good Feedback: "お水をいただけますか？" (根据场景推测最可能的完整表达)

【输出字段规则】
- feedback.correctedSentence: 
  * 必须保留用户原句的主语（通常为"私"）和语态（陈述/疑问/命令）。
  * 针对 N1 学习者，优先提供商务或成人得体的自然表达 (Natural/Polite)。
- feedback.explanation: 
  * 严格使用**日文**解释修改理由。
  * 重点解释语感差异（ニュアンス）、礼貌程度（丁寧さ）和场景适配性。
  * 禁止注音，假设用户能读懂常用汉字。
- feedback.naturalnessScore: 0-100 整数 (语法30% + 场景40% + 流畅度30%)。
- reply: 严格使用**日文**回应、所有外来语也必须使用片假名。
- replyTranslation: reply 的中文翻译，必须翻译成中文！。

【禁止行为】
- 严禁在 feedback 中评论或修改你自己的 reply。
- 严禁输出 JSON 代码块以外的任何文字。
"""

TITLE_PROMPT = (
  '请基于以下对话内容生成 20 个字以内的日语标题。严格要求：\n'
  '1. 只输出一个纯日语标题（仅包含汉字、假名）。\n'
  '2. 禁止包含罗马音、英文、标点符号。\n'
  '3. 禁止列举多个选项。\n'
  '4. 禁止添加任何前缀（如“标题：”）。\n'
  '对话内容：\n'
)

# 这个函数为原始 PCM 音频数据添加 WAV 头，以便于播放，如果需要的话可以调整采样率、通道数和采样宽度
# 默认假设 Gemini 返回的是 24kHz 单声道 16位 PCM 数据
# https://docs.fileformat.com/audio/wav/
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
    
    # 自动生成 AI 回复的音频
    if 'reply' in data:
      try:
        data['audioBase64'] = self.tts(data['reply'])
      except Exception as e:
        print(f"TTS generation failed in chat: {e}")
        # 即使 TTS 失败也继续返回文本响应
        data['audioBase64'] = None
    
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
