# Kokoro Coach - 日语口语学习助手

一个全栈 AI 日语口语练习应用，提供实时对话、智能纠错、语音交互和学习管理功能。
在线体验网址：https://japanesetalk.org/

## 主要功能

### 🗣️ AI 对话练习
- **双语对话**：基于 Google Gemini 的日语 AI 教练，提供日语回复和中文翻译
- **智能纠错**：自动检测语法错误，提供修正建议和自然度评分
- **会话管理**：多会话支持，自动生成标题，本地和云端双重存储

### 🎤 语音交互
- **语音输入**：基于浏览器 Web Speech API 的连续语音识别
- **TTS 朗读**：Google Gemini TTS（Kore 日语语音），一键播放 AI 回复
- **实时反馈**：边说边显示识别结果，支持手动修正

### 📚 学习管理
- **收藏本**：收藏 AI 回复、纠错建议或自选内容
- **划词收藏**：在对话区域选中文本即可快速收藏
- **抽认卡复习**：基于艾宾浩斯记忆曲线的复习模式，跟踪掌握程度
- **Markdown 导出**：一键导出所有收藏为 Markdown 格式

### 👤 用户系统
- **邮箱注册/登录**：JWT 令牌认证，支持白名单控制
- **个人资料**：自定义用户名、头像（裁剪上传）、时区设置
- **数据同步**：会话、消息、收藏自动同步到云端（SQLite）

### 🎨 用户体验
- **暗色模式**：支持亮色/暗色主题切换
- **响应式设计**：移动端和桌面端完美适配
- **Glassmorphism UI**：现代化的半透明毛玻璃界面设计

## 技术栈

- **前端**：React 19 + TypeScript + Vite + Tailwind CSS + Zustand
- **后端**：FastAPI + SQLAlchemy + SQLite + Pydantic
- **AI 服务**：Google Gemini API（Chat）+ VOICEVOX（TTS）
- **认证**：JWT + Argon2 密码哈希

## 环境准备

### 系统要求

- **Python**：3.9 或更高版本
- **Node.js**：18.0 或更高版本
- **npm**：9.0 或更高版本
- **VOICEVOX**：用于文字转语音（必须）

### VOICEVOX 安装

本项目使用 VOICEVOX 进行日语语音合成，请先安装并启动：

1. **下载 VOICEVOX**
   - 访问：https://voicevox.hiroshiba.jp/
   - 下载适合你操作系统的版本

2. **启动 VOICEVOX**
   - 打开 VOICEVOX 应用程序
   - 确认 API 服务运行在 `http://localhost:50021`

3. **验证安装**
   ```bash
   curl http://localhost:50021/version
   ```
   如果返回版本信息，说明安装成功。

### 后端环境配置

1. **创建虚拟环境**

```bash
cd backend
python -m venv .venv
```

2. **激活虚拟环境**

```bash
# macOS/Linux
source .venv/bin/activate

# Windows
.venv\Scripts\activate
```

3. **安装依赖**

```bash
pip install -e .
```

这会安装 `pyproject.toml` 中定义的所有依赖，包括：
- FastAPI + Uvicorn（Web 框架）
- SQLAlchemy 2.0（数据库 ORM）
- google-generativeai（Gemini API）
- pydantic[email]（数据验证）
- argon2-cffi（密码哈希）
- python-jose（JWT 令牌）
- nanoid（ID 生成）

4. **配置环境变量**

```bash
cp .env.example .env
```

编辑 `.env` 文件，填写必要的配置：

```env
# Gemini API 密钥（必填）
GOOGLE_API_KEY=your_gemini_api_key_here

# 模型配置
CHAT_MODEL=gemini-2.0-flash-exp
TTS_MODEL=gemini-2.5-flash-preview-tts

# VOICEVOX TTS 配置
VOICEVOX_URL=http://localhost:50021
VOICEVOX_SPEAKER=8  # 说话人 ID（8=春日部つむぎ）

# JWT 密钥（建议自行生成）
SECRET_KEY=your_secret_key_here

# CORS 配置（逗号分隔）
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# 数据库路径
DATABASE_URL=sqlite:///./chatbot.db

# 邮箱白名单文件（可选，为空则开放注册）
EMAIL_WHITELIST_FILE=email_whitelist.txt
```

5. **数据库迁移**（如果需要）

首次运行会自动创建数据库。

### 前端环境配置

1. **安装依赖**

```bash
cd frontend
npm install
```

这会安装所有前端依赖，包括：
- React + React DOM
- TypeScript + Vite
- Tailwind CSS（样式框架）
- Zustand（状态管理）
- Axios（HTTP 客户端）
- react-easy-crop（头像裁剪）
- react-markdown（Markdown 渲染）
- Sonner（通知组件）

2. **配置环境变量**（可选）

创建 `.env` 文件（如需自定义后端地址）：

```env
VITE_API_URL=http://localhost:8000
```

默认情况下，前端会将 `/api` 请求代理到 `http://localhost:8000`（参见 `vite.config.ts`）。

## 启动应用

### 方式一：使用快捷脚本（推荐）

项目提供了一键启动脚本，会同时启动前后端服务：

```bash
# 首次使用需要授予执行权限
chmod +x scripts/dev-start.sh scripts/dev-stop.sh scripts/dev-restart.sh

# 启动服务
./scripts/dev-start.sh

# 重启服务
./scripts/dev-restart.sh

# 停止服务
./scripts/dev-stop.sh
```

脚本会：
- 后台启动后端服务（端口 8000）
- 构建并启动前端服务（端口 5173）
- 将 PID 和日志保存在 `scripts/.runtime/` 目录
- 自动检测服务是否正常启动

访问：`http://localhost:5173`

### 方式二：手动启动

**后端**：

```bash
cd backend
source .venv/bin/activate  # 激活虚拟环境
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**前端**：

```bash
cd frontend
npm run dev
```

访问：`http://localhost:5173`

## 构建与测试

### 前端

```bash
cd frontend

# 运行测试
npm run test

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

构建产物位于 `frontend/dist/` 目录。

### 后端

```bash
cd backend
source .venv/bin/activate

# 运行测试（需先安装 pytest）
pip install pytest
pytest

# 生产环境启动
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 项目结构

```
ChatBot/
├── frontend/                    # React + Vite 前端
│   ├── src/
│   │   ├── components/         # UI 组件（消息气泡、侧边栏、模态框等）
│   │   ├── hooks/              # 自定义 Hooks（语音识别、音频播放）
│   │   ├── store/              # Zustand 状态管理
│   │   ├── lib/                # API 封装和工具函数
│   │   ├── types/              # TypeScript 类型定义
│   │   └── constants/          # 常量配置
│   ├── public/                 # 静态资源
│   └── package.json
│
├── backend/                     # FastAPI 后端
│   ├── app/
│   │   ├── main.py             # 应用入口
│   │   ├── config.py           # 配置管理
│   │   ├── models.py           # SQLAlchemy 数据模型
│   │   ├── schemas.py          # Pydantic 数据模式
│   │   ├── auth.py             # JWT 认证
│   │   ├── database.py         # 数据库连接
│   │   ├── routers/            # API 路由（chat、sessions、auth 等）
│   │   └── services/           # 业务逻辑（Gemini 服务）
│   ├── pyproject.toml          # Python 依赖配置
│   ├── chatbot.db              # SQLite 数据库（运行后生成）
│   └── migrate_*.py            # 数据库迁移脚本
│
├── scripts/                     # 启动脚本
│   ├── dev-start.sh            # 一键启动
│   ├── dev-stop.sh             # 一键停止
│   ├── dev-restart.sh          # 一键重启
│   └── .runtime/               # 运行时文件（PID、日志）
│
├── docs/                        # 文档
│   └── architecture.md         # 架构设计文档
│
└── README.md                    # 项目说明
```

## 常见问题

### 1. 后端启动失败

- 检查是否激活了虚拟环境
- 确认 `.env` 文件中的 `GOOGLE_API_KEY` 已正确配置
- 查看日志：`cat scripts/.runtime/backend.log`

### 2. 前端无法连接后端

- 确认后端服务已启动（`http://localhost:8000/docs` 应可访问）
- 检查 CORS 配置：`.env` 中的 `ALLOWED_ORIGINS` 是否包含前端地址
- 检查防火墙设置

### 3. 语音识别不工作

- 确认使用的是支持 Web Speech API 的浏览器（Chrome、Edge）
- 检查浏览器是否授予了麦克风权限
- 必须使用 HTTPS 或 localhost

### 4. 注册失败

- 检查是否启用了邮箱白名单（`email_whitelist.txt`）
- 如果启用白名单，确认邮箱已添加到白名单中
- 如需开放注册，删除或清空白名单文件

## 开发指南

### 添加新功能

1. **前端**：在 `frontend/src/components/` 创建组件，在 `useChatStore.ts` 添加状态和方法
2. **后端**：在 `backend/app/routers/` 创建路由，在 `services/` 实现业务逻辑
3. **数据库**：修改 `models.py`，创建迁移脚本 `migrate_*.py`

### 代码规范

- **前端**：使用 ESLint 检查代码质量（`npm run lint`）
- **后端**：遵循 PEP 8 规范，使用类型注解
- **提交**：遵循 Conventional Commits 规范

## 许可证

MIT License

## 致谢

- Google Gemini AI
- React、FastAPI 等开源社区
