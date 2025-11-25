# Kokoro Coach · Frontend

React + Vite 单页应用，提供日语口语实时练习、AI 纠错、语音输入与收藏复习体验。

## 核心技术

- React 19、TypeScript、Vite
- Tailwind CSS + Glassmorphism UI
- Zustand 本地状态 + `localStorage` 持久化
- @google/genai API 代理（经由 FastAPI 后端）
- Web Speech API（语音输入） & Gemini TTS（播放 Kore 声音）

## 本地运行

```bash
cd frontend
npm install
npm run dev
```

默认会将 `/api` 请求代理到 `http://localhost:8000`。请同时启动 FastAPI 服务（见 `backend/README.md`）。

## 环境变量

在 `frontend/.env` 中配置：

```
VITE_API_BASE_URL=http://localhost:8000/api
```

## 可用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 开发服务器 + HMR |
| `npm run build` | 产线构建 |
| `npm run preview` | 预览构建产物 |
| `npm run test` | Vitest + Testing Library |

## 目录速览

- `src/components`：聊天气泡、收藏抽屉、语音按钮等 UI 组件
- `src/hooks`：语音识别、音频播放、划词收藏逻辑
- `src/store`：Zustand 切片，持久化对话、收藏与 UI 状态
- `src/lib/api.ts`：与 FastAPI 后端交互的薄封装
- `src/types`：公共类型定义与语音 API 声明

## 设计亮点

- AI 回复采用 Markdown 渲染 + 一键收藏 + TTS 播放
- 用户消息下方显示自然度评分、改写句与中文解释
- 收藏本支持 Markdown 导出与抽认卡复习模式
- 语音输入支持连续听写、增量追加、错误提示
- 全面使用玻璃拟态 + Indigo/Rose 色板，适配移动端
