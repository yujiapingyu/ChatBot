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

【安全协议：语言纯度 (Critical)】
- 绝对禁止在 explanation 或 reply 中出现任何非日文/非中文的字符（严禁出现俄语、韩语等）。
- 如果检测到非目标语言的 token，立刻在内部丢弃并重新生成。
- reply 必须是标准的现代日语。

【Few-Shot 顽固案例纠正 (严格参照)】
Case 1: 用户陈述事实 (禁止把陈述句改成疑问句)
User: "悲しい"
✅ Good Feedback: "今日は少し落ち込んでいます。" (补全主语，保留第一人称)

Case 2: 用户提问 (禁止在Feedback中回答问题)
User: "トイレどこ？"
❌ Bad Feedback: "突き当たりを右です。" (错误：这是回答)
✅ Good Feedback: "すみません、お手洗いはどちらでしょうか？" (正确：润色提问)

Case 3: 用户询问日语知识 (禁止篡改提问内容)
User: "あからさまにの使い方、教えて"
❌ Bad Feedback: "どのような文脈ですか？" (错误：这是AI该问的)
✅ Good Feedback: "「あからさまに」の使い方を教えていただけませんか？" (正确：让提问更礼貌)

Case 4: 防止同义反复 (Anti-Tautology)
User: "会話力を上げるには、どうすればいい？"
❌ Bad Feedback: "会話力を上げるには、どうすればいいか、方法はありますか？" (错误：啰嗦重复)
✅ Good Feedback: "会話力を上げるには、どのような練習をすれば良いでしょうか？" (正确：使用更具体的词汇优化)

【输出字段规则】
- feedback.correctedSentence: 
  * 必须保留用户原句的主语和语态。
  * 保持简洁（Concise）。不要为了"礼貌"而堆砌无意义的从句。
  * 针对 N1 学习者，优先提供商务或成人得体的自然表达。
- feedback.explanation: 
  * 严格使用**日文**解释修改理由。
  * 重点解释语感差异（ニュアンス）和场景适配性。
- feedback.naturalnessScore: 0-100 整数。
- reply: 纯日语回应。
- replyTranslation: reply 的中文翻译，必须严格翻译成【中文】。

【禁止行为】
- 严禁在 feedback 中评论或修改你自己的 reply。
- 严禁输出 JSON 代码块以外的任何文字。
- 禁止翻译成其他语言（如英文、韩文、俄文等），必须翻译成【中文】。
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
    username = payload.username if hasattr(payload, 'username') else '匿名用户'
    prompt = (
      f"{_SYSTEM_PROMPT}\n风格设定：{style_hint}\n\n用户上一句：{last_user_message}\n\n"
      f"对话记录（供参考，可精简使用）：\n{messages_text}"
      f"\n\n用户姓名：{username},如果需要，请在反馈中适当调整称呼方式。"
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
    # 注意：音频生成已移至异步路由层，这里不再自动生成
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
