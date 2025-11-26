#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_DIR="${ROOT_DIR}/scripts"

echo "正在重启服务..."

# 停止现有服务
bash "${SCRIPT_DIR}/dev-stop.sh"

# 重新编译前端
echo "正在重新编译前端..."
cd "${ROOT_DIR}/frontend"
npm install
npm run build
cd "${ROOT_DIR}"
echo "前端编译完成."

# 等待进程完全结束
sleep 1

# 启动服务
bash "${SCRIPT_DIR}/dev-start.sh"

echo "服务重启完成"
