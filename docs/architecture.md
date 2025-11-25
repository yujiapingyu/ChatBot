# 架构设计说明

## 总览
- **前端**：React 18 + Vite + TypeScript，配合 Tailwind CSS、Lucide 图标和 React Markdown 渲染 AI 回复。状态使用 Zustand 管理并持久化到 `localStorage`。
- **后端**：Python FastAPI 作为 Google Gemini 的轻量代理（使用 `google-generativeai` SDK）。提供对话、结构化纠错、TTS 语音以及自动标题等接口。不依赖数据库，长期数据由浏览器保存。

## 核心模块
1. **对话与纠错引擎**
   - 发送消息前保留最近 12 条对话，构成滑动窗口。
   - 期望后端输出 `{ reply, replyTranslation, feedback { correctedSentence, explanation, naturalnessScore }, audioBase64? }`。
   - 前端用 Markdown 渲染，并支持语音播放。

2. **语音输入**
   - 基于 `window.SpeechRecognition` 的 Hook；支持连续听写、增量追加、自动空格以及错误提示（no-speech、not-allowed 等）。

3. **语音合成（TTS）**
   - 调用 `/api/tts` 获得 Kore 声音的 Base64 音频，通过 `AudioContext` 解码并跟踪播放状态。

4. **知识收藏系统**
   - Zustand 中维护收藏：`{ id, text, translation, source, createdAt, mastery }`。
   - 支持整句书签、划词收藏、Markdown 导出与抽认卡复习（艾宾浩斯节奏）。

5. **会话管理**
   - 侧边栏列出历史会话，含自动标题（后端总结）、新建/删除/清空功能。
   - 所有数据保存在 `localStorage`，未来可挂接数据库。

## 状态与存储
- Zustand 按功能拆分：会话、消息、收藏、UI。
- 主要存储键：`jpchat_sessions`、`jpchat_messages`、`jpchat_favorites`。
- 对写入频繁的切片做节流/去抖，降低性能消耗。

## 设计与体验
- Tailwind 主题扩展 Indigo 主色、Rose 强调色、Slate 中性色，并提供玻璃拟态阴影与模糊工具类。
- 核心组件：`Sidebar`、`MessageBubble`、`CorrectionCard`、`VoiceRecorderButton`、`FavoritesDrawer`、`FlashcardModal`。

## 后端接口
- `POST /api/chat`：接受 `{ sessionId, messages }`，调用 Gemini JSON Schema 输出结构化结果。
- `POST /api/tts`：接受 `{ text }`，使用 `gemini-2.5-flash-preview-tts` 生成音频。
- `POST /api/title`：接受 `{ transcript }`，生成 6 字以内的日中混合标题。

## 环境与构建
- 前端：使用 Vite 脚本（`dev`/`build`/`preview`），Tailwind 通过 PostCSS 与 autoprefixer 处理。
- 后端：FastAPI + uvicorn，可通过 `.env` 配置 `GOOGLE_API_KEY` 等变量。

## 测试策略
- 前端：Vitest + React Testing Library，覆盖 Zustand 逻辑与关键 Hook。
- 后端：Pytest（可 Mock Gemini SDK）验证接口契约与错误处理。
