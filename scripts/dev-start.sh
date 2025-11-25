#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_DIR="${ROOT_DIR}/scripts"
RUNTIME_DIR="${SCRIPT_DIR}/.runtime"
BACKEND_DIR="${ROOT_DIR}/backend"
FRONTEND_DIR="${ROOT_DIR}/frontend"
BACKEND_PID_FILE="${RUNTIME_DIR}/backend.pid"
FRONTEND_PID_FILE="${RUNTIME_DIR}/frontend.pid"
BACKEND_LOG="${RUNTIME_DIR}/backend.log"
FRONTEND_LOG="${RUNTIME_DIR}/frontend.log"

mkdir -p "${RUNTIME_DIR}"
touch "${BACKEND_LOG}" "${FRONTEND_LOG}"

detect_backend_python() {
    if [[ -x "${BACKEND_DIR}/.venv/bin/python" ]]; then
        echo "${BACKEND_DIR}/.venv/bin/python"
        return 0
    fi

    if command -v python3 >/dev/null 2>&1; then
        command -v python3
        return 0
    fi

    if command -v python >/dev/null 2>&1; then
        command -v python
        return 0
    fi

    echo "未找到 Python 解释器，请先安装 python3 或在 backend 目录创建虚拟环境" >&2
    return 1
}

ensure_not_running() {
    local service_name="$1"
    local pid_file="$2"

    if [[ -f "${pid_file}" ]]; then
        local existing_pid
        existing_pid="$(cat "${pid_file}")"
        if kill -0 "${existing_pid}" 2>/dev/null; then
            echo "${service_name} 已在运行 (PID ${existing_pid})，如需重启请先执行 scripts/dev-stop.sh" >&2
            exit 1
        else
            rm -f "${pid_file}"
        fi
    fi
}

verify_process() {
    local service_name="$1"
    local pid="$2"
    local log_file="$3"
    local retries=10

    for ((i = 0; i < retries; i++)); do
        if ! kill -0 "${pid}" 2>/dev/null; then
            echo "${service_name} 启动失败，最近日志如下：" >&2
            tail -n 40 "${log_file}" >&2 || true
            exit 1
        fi
        sleep 0.5
    done
}

start_backend() {
    local port="${BACKEND_PORT:-8000}"
    local python_bin
    python_bin="$(detect_backend_python)" || exit 1
    local backend_cmd
    printf -v backend_cmd 'cd "%s" && exec "%s" -m uvicorn app.main:app --reload --host 0.0.0.0 --port %s' \
        "${BACKEND_DIR}" "${python_bin}" "${port}"

    nohup bash -c "${backend_cmd}" >>"${BACKEND_LOG}" 2>&1 &
    local backend_pid=$!
    echo "${backend_pid}" >"${BACKEND_PID_FILE}"
    verify_process "后端" "${backend_pid}" "${BACKEND_LOG}"
    echo "后端已启动：PID=${backend_pid}，端口=${port}（日志：${BACKEND_LOG}）"
}

start_frontend() {
    local port="${FRONTEND_PORT:-5173}"
    local frontend_cmd
    printf -v frontend_cmd 'cd "%s" && ' "${FRONTEND_DIR}"
    frontend_cmd+="exec npm run dev -- --host 0.0.0.0 --port ${port}"

    nohup bash -c "${frontend_cmd}" >>"${FRONTEND_LOG}" 2>&1 &
    local frontend_pid=$!
    echo "${frontend_pid}" >"${FRONTEND_PID_FILE}"
    verify_process "前端" "${frontend_pid}" "${FRONTEND_LOG}"
    echo "前端已启动：PID=${frontend_pid}，端口=${port}（日志：${FRONTEND_LOG}）"
}

ensure_not_running "后端" "${BACKEND_PID_FILE}"
ensure_not_running "前端" "${FRONTEND_PID_FILE}"

start_backend
start_frontend

echo "所有服务均已后台运行。使用 scripts/dev-stop.sh 可一键停止。"
