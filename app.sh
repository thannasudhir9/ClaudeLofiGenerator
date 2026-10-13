#!/usr/bin/env bash
# ==============================================================================
# Claude LoFi, Anime & Pixar Studio - Application Controller (app.sh)
# Commands: start | stop | restart | status | help
# ==============================================================================

set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

BACKEND_PORT=3000
FRONTEND_PORT=3001
LOG_DIR="$APP_DIR/logs"
PID_DIR="$APP_DIR/.pids"

mkdir -p "$LOG_DIR" "$PID_DIR"

BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ------------------------------------------------------------------------------
# HELPER FUNCTIONS
# ------------------------------------------------------------------------------
get_pid_by_port() {
    local port="$1"
    local pid=""
    if command -v lsof >/dev/null 2>&1; then
        pid=$(lsof -ti :"$port" 2>/dev/null | head -n 1 || true)
    elif command -v fuser >/dev/null 2>&1; then
        pid=$(fuser "$port"/tcp 2>/dev/null | awk '{print $1}' || true)
    elif command -v ss >/dev/null 2>&1; then
        pid=$(ss -lptn "sport = :$port" 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d'=' -f2 | head -n 1 || true)
    elif command -v netstat.exe >/dev/null 2>&1; then
        pid=$(netstat.exe -ano 2>/dev/null | grep ":$port " | grep "LISTENING" | awk '{print $5}' | head -n 1 || true)
    elif command -v netstat >/dev/null 2>&1; then
        pid=$(netstat -tlpn 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f1 | head -n 1 || true)
    fi
    echo "$pid"
}

is_port_in_use() {
    local port="$1"
    local pid
    pid=$(get_pid_by_port "$port")
    if [ -n "$pid" ]; then
        return 0
    else
        return 1
    fi
}

# ------------------------------------------------------------------------------
# STATUS ACTION
# ------------------------------------------------------------------------------
do_status() {
    echo ""
    echo -e "${BOLD}==============================================================================${NC}"
    echo -e "  ${CYAN}CLAUDE LOFI STUDIO - SERVICE HEALTH & PORT STATUS${NC}"
    echo -e "${BOLD}==============================================================================${NC}"

    local b_pid
    b_pid=$(get_pid_by_port "$BACKEND_PORT")
    if [ -n "$b_pid" ]; then
        echo -e "  [${GREEN}RUNNING${NC}] Backend Engine  : http://localhost:${BACKEND_PORT} [PID: ${b_pid}]"
    else
        echo -e "  [${RED}STOPPED${NC}] Backend Engine  : http://localhost:${BACKEND_PORT}"
    fi

    local f_pid
    f_pid=$(get_pid_by_port "$FRONTEND_PORT")
    if [ -n "$f_pid" ]; then
        echo -e "  [${GREEN}RUNNING${NC}] Next.js Studio  : http://localhost:${FRONTEND_PORT} [PID: ${f_pid}]"
    else
        echo -e "  [${RED}STOPPED${NC}] Next.js Studio  : http://localhost:${FRONTEND_PORT}"
    fi

    echo ""
    echo -e "  Unlimited Credits : ${GREEN}999,999,999 (100% Free, Zero Paywalls)${NC}"
    echo -e "  Output Storage    : ${APP_DIR}/outputs/"
    echo -e "  Logs Directory    : ${LOG_DIR}/"
    echo -e "${BOLD}==============================================================================${NC}"
    echo ""
}

# ------------------------------------------------------------------------------
# START ACTION
# ------------------------------------------------------------------------------
do_start() {
    echo ""
    echo -e "${BOLD}==============================================================================${NC}"
    echo -e "  ${CYAN}STARTING CLAUDE LOFI STUDIO SERVICES${NC}"
    echo -e "${BOLD}==============================================================================${NC}"

    # 1. Start Backend
    local b_pid
    b_pid=$(get_pid_by_port "$BACKEND_PORT")
    if [ -n "$b_pid" ]; then
        echo -e "  ${YELLOW}[i]${NC} Backend is already active on port ${BACKEND_PORT} [PID: ${b_pid}]"
    else
        echo -e "  ${CYAN}[*]${NC} Starting Backend Engine on port ${BACKEND_PORT}..."
        nohup node server.mjs > "$LOG_DIR/backend.log" 2>&1 &
        local new_b_pid=$!
        echo "$new_b_pid" > "$BACKEND_PID_FILE"
        sleep 2
    fi

    # 2. Start Frontend
    local f_pid
    f_pid=$(get_pid_by_port "$FRONTEND_PORT")
    if [ -n "$f_pid" ]; then
        echo -e "  ${YELLOW}[i]${NC} Frontend Studio is already active on port ${FRONTEND_PORT} [PID: ${f_pid}]"
    else
        echo -e "  ${CYAN}[*]${NC} Starting Next.js Web Studio on port ${FRONTEND_PORT}..."
        (cd web && nohup npm run dev -- -p "$FRONTEND_PORT" > "$LOG_DIR/frontend.log" 2>&1 & echo $! > "$FRONTEND_PID_FILE")
        sleep 3
    fi

    echo -e "  ${CYAN}[*]${NC} Waiting for services to initialize..."
    sleep 2

    do_status
}

# ------------------------------------------------------------------------------
# STOP ACTION
# ------------------------------------------------------------------------------
do_stop() {
    echo ""
    echo -e "${BOLD}==============================================================================${NC}"
    echo -e "  ${CYAN}STOPPING CLAUDE LOFI STUDIO SERVICES${NC}"
    echo -e "${BOLD}==============================================================================${NC}"

    local stopped_any=0

    # Stop Backend
    local b_pid
    b_pid=$(get_pid_by_port "$BACKEND_PORT")
    if [ -n "$b_pid" ]; then
        echo -e "  ${CYAN}[*]${NC} Stopping Backend on port ${BACKEND_PORT} [PID: ${b_pid}]..."
        kill -9 "$b_pid" 2>/dev/null || taskkill.exe //f //pid "$b_pid" 2>/dev/null || true
        stopped_any=1
    fi
    if [ -f "$BACKEND_PID_FILE" ]; then
        local saved_b
        saved_b=$(cat "$BACKEND_PID_FILE" 2>/dev/null || true)
        if [ -n "$saved_b" ]; then
            kill -9 "$saved_b" 2>/dev/null || taskkill.exe //f //pid "$saved_b" 2>/dev/null || true
        fi
        rm -f "$BACKEND_PID_FILE"
    fi

    # Stop Frontend
    local f_pid
    f_pid=$(get_pid_by_port "$FRONTEND_PORT")
    if [ -n "$f_pid" ]; then
        echo -e "  ${CYAN}[*]${NC} Stopping Frontend on port ${FRONTEND_PORT} [PID: ${f_pid}]..."
        kill -9 "$f_pid" 2>/dev/null || taskkill.exe //f //pid "$f_pid" 2>/dev/null || true
        stopped_any=1
    fi
    if [ -f "$FRONTEND_PID_FILE" ]; then
        local saved_f
        saved_f=$(cat "$FRONTEND_PID_FILE" 2>/dev/null || true)
        if [ -n "$saved_f" ]; then
            kill -9 "$saved_f" 2>/dev/null || taskkill.exe //f //pid "$saved_f" 2>/dev/null || true
        fi
        rm -f "$FRONTEND_PID_FILE"
    fi

    sleep 1

    if ! is_port_in_use "$BACKEND_PORT" && ! is_port_in_use "$FRONTEND_PORT"; then
        echo -e "  [${GREEN}OK${NC}] All studio services stopped successfully."
    else
        echo -e "  ${YELLOW}[!]${NC} Some processes could not be stopped automatically."
    fi
    echo ""
}

# ------------------------------------------------------------------------------
# RESTART ACTION
# ------------------------------------------------------------------------------
do_restart() {
    echo ""
    echo -e "${CYAN}[*] Restarting Claude LoFi Studio...${NC}"
    do_stop
    sleep 2
    do_start
}

# ------------------------------------------------------------------------------
# USAGE GUIDE
# ------------------------------------------------------------------------------
show_usage() {
    echo "Usage: ./app.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start     Launch Backend (port 3000) and Next.js Studio (port 3001)"
    echo "  stop      Stop all running studio instances"
    echo "  restart   Stop and perform fresh launch"
    echo "  status    Check status of ports 3000 and 3001"
    echo "  help      Show this help message"
    echo ""
    echo "Running without arguments opens an interactive control menu."
}

# ------------------------------------------------------------------------------
# INTERACTIVE MENU
# ------------------------------------------------------------------------------
interactive_menu() {
    clear
    echo "=============================================================================="
    echo "      CLAUDE LOFI, ANIME & PIXAR CREATOR STUDIO - CONTROLLER"
    echo "=============================================================================="
    echo ""
    echo "  1. Start Studio       (Launch Backend :$BACKEND_PORT & Frontend :$FRONTEND_PORT)"
    echo "  2. Stop Studio        (Terminate all studio services)"
    echo "  3. Restart Studio     (Stop and fresh launch)"
    echo "  4. Service Status     (Check ports and health)"
    echo "  5. Open in Browser    (http://localhost:$FRONTEND_PORT)"
    echo "  6. Exit"
    echo ""
    read -rp "Enter choice [1-6]: " choice
    case "$choice" in
        1) do_start ;;
        2) do_stop ;;
        3) do_restart ;;
        4) do_status ;;
        5)
            if command -v xdg-open >/dev/null 2>&1; then
                xdg-open "http://localhost:$FRONTEND_PORT"
            elif command -v open >/dev/null 2>&1; then
                open "http://localhost:$FRONTEND_PORT"
            elif command -v start >/dev/null 2>&1; then
                start "http://localhost:$FRONTEND_PORT"
            else
                echo "Please open http://localhost:$FRONTEND_PORT in your browser."
            fi
            interactive_menu
            ;;
        6) exit 0 ;;
        *)
            echo "Invalid option. Please enter 1-6."
            sleep 2
            interactive_menu
            ;;
    esac
}

# ------------------------------------------------------------------------------
# ENTRYPOINT DISPATCHER
# ------------------------------------------------------------------------------
CMD="${1:-}"

case "$CMD" in
    start)
        do_start
        ;;
    stop)
        do_stop
        ;;
    restart)
        do_restart
        ;;
    status)
        do_status
        ;;
    help|--help|-h)
        show_usage
        ;;
    "")
        interactive_menu
        ;;
    *)
        echo -e "${RED}[!] Unknown command: $CMD${NC}"
        echo ""
        show_usage
        exit 1
        ;;
esac
