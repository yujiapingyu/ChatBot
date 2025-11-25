# 后端服务

此目录包含 FastAPI 对接 Google Gemini 的代理层，为前端提供统一的 Chat、纠错、TTS 与标题生成功能。

## 快速启动

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
cp .env.example .env  # 填入 GOOGLE_API_KEY / CHAT_MODEL / TTS_MODEL
uvicorn app.main:app --reload
```

## 环境变量

```
GOOGLE_API_KEY=你的谷歌密钥
CHAT_MODEL=gemini-2.0-flash-exp
TTS_MODEL=gemini-2.5-flash-preview-tts
```

## API 列表

- `POST /api/chat`：根据会话历史返回结构化 JSON（回复、翻译、纠错反馈）。
- `POST /api/tts`：生成 Kore 语音的 Base64 音频片段。
- `POST /api/title`：为当前对话生成 6 字以内的标题。

接口错误会返回易读的提示信息，前端 Toast 可直接展示。
