# Kokoro Coach

全栈日语口语练习应用：React + Vite 前端 + FastAPI 后端（Gemini 代理），提供实时对话、语音输入、纠错、收藏与复习工具。

## 1. 项目结构

```
├── frontend/                    # Vite + React + Tailwind 前端工程
│   ├── src/components           # 聊天气泡、收藏抽屉、语音控件等 UI 组件
│   ├── src/hooks                # 语音识别、音频播放、划词收藏等自定义 Hook
│   ├── src/store                # Zustand 状态管理及测试
│   ├── src/lib/api.ts           # 与 FastAPI 的 API 封装
│   └── src/types                # 公共类型与 Web Speech 声明
├── backend/                     # FastAPI 服务（Gemini Chat/TTS/Title 代理）
│   ├── app/main.py              # 入口，挂载路由与 CORS
│   ├── app/routers              # chat / tts / title 路由
│   ├── app/services/gemini.py   # 调用 google-generativeai SDK
│   ├── app/schemas.py           # Pydantic 请求/响应模型
│   └── pyproject.toml           # 依赖管理
├── docs/architecture.md         # 架构设计说明
└── README.md                    # 项目说明（当前文件）
```

## 2. 启动方式

### 后端（FastAPI + Gemini 代理）

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e .
cp .env.example .env  # 填写 GOOGLE_API_KEY / CHAT_MODEL / TTS_MODEL
uvicorn app.main:app --reload
```

### 前端（Vite + React）

```bash
cd frontend
npm install
npm run dev
```

默认前端将 `/api` 代理到 `http://localhost:8000`，请确保后端已启动。

### 一键启动 / 关闭脚本

已在 `scripts/` 目录提供：

- `./scripts/dev-start.sh`：同时以后台方式启动 FastAPI（默认 8000 端口）与 Vite（默认 5173 端口），PID、日志保存在 `scripts/.runtime/`。
- `./scripts/dev-stop.sh`：读取 PID 并安全停止上述两个进程。

使用前请确保：

- 已在 `backend/` 准备好虚拟环境并安装依赖（脚本会自动尝试 `source backend/.venv/bin/activate`）。
- 已在 `backend/` 准备好虚拟环境并安装依赖（脚本会优先调用 `backend/.venv/bin/python -m uvicorn`，若不存在则回退到系统 python）。
- `frontend/` 已执行过 `npm install`。
- 需要自定义端口时，可在运行脚本前设置 `BACKEND_PORT` 或 `FRONTEND_PORT` 环境变量。

示例：

```bash
chmod +x scripts/dev-start.sh scripts/dev-stop.sh  # 首次需要
./scripts/dev-start.sh
# ... 开发完成后
./scripts/dev-stop.sh
```

脚本在启动后会检测进程是否仍在运行，若发现异常将立即退出并打印 `scripts/.runtime/*.log` 的最后 40 行，方便排查。
若需手动查看日志，可读取 `scripts/.runtime/backend.log` 与 `scripts/.runtime/frontend.log`。

## 3. 构建与测试

- 前端
	- `npm run build`：TypeScript 编译 + Vite 产线构建
	- `npm run test`：Vitest + Testing Library（已在 `vitest.setup.ts` 中准备 localStorage polyfill）
- 后端
	- `pip install -e .[dev] && pytest`：启用 `pyproject.toml` 中的 `dev` 依赖后运行单元测试（建议模拟 Gemini 调用）
- 生产部署
	- 前端构建产物位于 `frontend/dist/`
	- 后端可使用 `uvicorn app.main:app --host 0.0.0.0 --port 8000` 或任意 ASGI 服务器

## 关键特性（摘录）

- Gemini 结构化 JSON：日语回复 + 中文翻译 + 纠错卡片（自然度打分）
- 浏览器 SpeechRecognition 连续听写，支持增量追加与错误提示
- Gemini TTS（Kore 语音）Base64 播放，消息内一键播放/停止
- 收藏本 + 划词收藏 + Markdown 导出 + 抽认卡复习（艾宾浩斯循环）
- 会话侧边栏、自动标题、localStorage 持久化
- Glassmorphism UI，Indigo / Rose / Slate 色板，移动端适配
