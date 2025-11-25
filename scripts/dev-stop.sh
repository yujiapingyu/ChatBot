#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_DIR="${ROOT_DIR}/scripts"
RUNTIME_DIR="${SCRIPT_DIR}/.runtime"
BACKEND_PID_FILE="${RUNTIME_DIR}/backend.pid"
FRONTEND_PID_FILE="${RUNTIME_DIR}/frontend.pid"

stop_service() {
    local service_name="$1"
    local pid_file="$2"

    if [[ ! -f "${pid_file}" ]]; then
        echo "${service_name} 未发现运行记录"
        return
    fi

    local pid
    pid="$(cat "${pid_file}")"

    if kill -0 "${pid}" 2>/dev/null; then
        kill "${pid}"
        echo "${service_name} 已发送停止信号 (PID ${pid})"
        wait "${pid}" 2>/dev/null || true
    else
        echo "${service_name} 进程不存在，清理残留 PID"
    fi

    rm -f "${pid_file}"
}

if [[ ! -d "${RUNTIME_DIR}" ]]; then
    echo "未找到运行记录，无需停止"
    exit 0
fi

stop_service "前端" "${FRONTEND_PID_FILE}"
stop_service "后端" "${BACKEND_PID_FILE}"

echo "所有服务已停止"
