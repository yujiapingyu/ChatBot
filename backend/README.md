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

# VOICEVOX TTS 配置
VOICEVOX_URL=http://localhost:50021
VOICEVOX_SPEAKER=8  # 说话人 ID（8=春日部つむぎ）
```

## 前置要求

### VOICEVOX

本项目使用 VOICEVOX 进行文字转语音。请确保 VOICEVOX 已启动并监听端口 50021。

**下载和启动 VOICEVOX：**

1. 下载：https://voicevox.hiroshiba.jp/
2. 启动 VOICEVOX 应用程序
3. 确认 API 服务运行在 `http://localhost:50021`

**说话人选择：**

常用的日语说话人 ID：
- 8: 春日部つむぎ（默认）
- 3: ずんだもん
- 1: 四国めたん

可以通过修改 `.env` 中的 `VOICEVOX_SPEAKER` 来切换说话人。

## API 列表

- `POST /api/chat`：根据会话历史返回结构化 JSON（回复、翻译、纠错反馈）。自动使用 VOICEVOX 生成音频。
- `POST /api/tts`：使用 VOICEVOX 生成日语语音的 Base64 音频片段。
- `POST /api/title`：为当前对话生成 6 字以内的标题。

接口错误会返回易读的提示信息，前端 Toast 可直接展示。
