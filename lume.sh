#!/bin/bash

# Lume Unified Management Script
# Usage: ./lume.sh [command] [service] [options]

set -euo pipefail

# ============== Configuration ==============
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
WEB_LUME_DIR="$SCRIPT_DIR/frontend/apps/web-lume"
LOG_DIR="$SCRIPT_DIR/logs"

# Default ports
DEFAULT_BACKEND_PORT=3000
DEFAULT_FRONTEND_PORT=5173
DEFAULT_FRONTEND_PREVIEW_PORT=4173

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ============== Port Management ==============
get_available_port() {
    local port=$1
    local max_attempts=10
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if ! is_port_in_use "$port"; then
            echo "$port"
            return 0
        fi
        port=$((port + 1))
        attempt=$((attempt + 1))
    done
    
    return 1
}

is_port_in_use() {
    local port=$1
    if command_exists lsof; then
        lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1
    elif command_exists ss; then
        ss -tuln | grep -q ":$port "
    else
        # Fallback: try to connect
        (echo >/dev/tcp/localhost/$port) 2>/dev/null
    fi
}

get_pid_by_port() {
    local port=$1
    if command_exists lsof; then
        lsof -Pi :$port -sTCP:LISTEN -t 2>/dev/null | head -1
    elif command_exists fuser; then
        fuser $port/tcp 2>/dev/null | awk '{print $2}' | head -1
    fi
}

# ============== Process Tree Management ==============
get_process_tree() {
    local pid="$1"
    local pids="$pid"
    local children=$(pgrep -P "$pid" 2>/dev/null || true)
    for child in $children; do
        pids="$pids $(get_process_tree $child)"
    done
    echo "$pids"
}

kill_process_tree() {
    local pid="$1"
    local signal="${2:-TERM}"
    local all_pids=$(get_process_tree "$pid")
    for p in $(echo "$all_pids" | tr ' ' '\n' | tac); do
        if ps -p "$p" >/dev/null 2>&1; then
            kill -"$signal" "$p" 2>/dev/null || true
        fi
    done
}

# ============== Process Management ==============
check_process() {
    local pid=$1
    local name=$2
    
    if [ -z "$pid" ]; then
        return 1
    fi
    
    if ! ps -p "$pid" >/dev/null 2>&1; then
        return 1
    fi
    
    # Verify it's the correct process by checking cmdline
    local cmdline=$(cat /proc/$pid/cmdline 2>/dev/null | tr '\0' ' ')
    if [[ "$cmdline" == *"$name"* ]] || [[ "$cmdline" == *"node"* ]]; then
        return 0
    fi
    
    return 1
}

kill_process_safe() {
    local pid=$1
    local name=$2
    local timeout=${3:-5}
    
    if [ -z "$pid" ] || ! ps -p "$pid" >/dev/null 2>&1; then
        return 0
    fi
    
    # Verify it's our process
    if ! check_process "$pid" "$name"; then
        echo -e "${YELLOW}[WARN]${NC} PID $pid is not our $name, skipping"
        return 0
    fi
    
    echo -e "${BLUE}[INFO]${NC} Stopping $name (PID: $pid)..."
    
    # Use process tree killing for proper cleanup
    kill_process_tree "$pid" "TERM"
    
    local waited=0
    while [ $waited -lt $timeout ] && ps -p "$pid" >/dev/null 2>&1; do
        sleep 1
        waited=$((waited + 1))
    done
    
    # Force kill if still running
    if ps -p "$pid" >/dev/null 2>&1; then
        kill_process_tree "$pid" "KILL"
        sleep 1
    fi
    
    if ps -p "$pid" >/dev/null 2>&1; then
        echo -e "${YELLOW}[WARN]${NC} $name (PID: $pid) may still be running"
        return 1
    fi
    
    echo -e "${GREEN}[SUCCESS]${NC} $name stopped"
    return 0
}

cleanup_stale_pid() {
    local pid_file=$1
    local name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if [ -n "$pid" ] && ! ps -p "$pid" >/dev/null 2>&1; then
            rm -f "$pid_file"
            echo -e "${YELLOW}[WARN]${NC} Removed stale PID file for $name"
        fi
    fi
}

# ============== Service Management ==============
stop_service_by_port() {
    local port=$1
    local name=$2
    
    local pid=$(get_pid_by_port "$port")
    if [ -n "$pid" ]; then
        kill_process_safe "$pid" "$name"
    fi
    
    # Also try by pattern
    pkill -f "node.*$name" 2>/dev/null || true
}

# ============== Output Functions ==============
print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_header() { echo -e "${CYAN}$1${NC}"; }

command_exists() { command -v "$1" >/dev/null 2>&1; }

# ============== Health Checks ==============
wait_for_url() {
    local url="$1"
    local name="$2"
    local max_wait="${3:-30}"
    local waited=0

    print_status "Waiting for $name to be ready..."
    while [ $waited -lt $max_wait ]; do
        if curl -sf "$url" >/dev/null 2>&1; then
            print_success "$name is ready!"
            return 0
        fi
        sleep 1
        waited=$((waited + 1))
    done
    print_error "$name failed to start within ${max_wait}s"
    return 1
}

# ============== Prerequisites ==============
check_node() {
    if command_exists node; then
        print_success "Node.js: $(node --version)"
        return 0
    else
        print_error "Node.js not found. Please install Node.js 20+"
        return 1
    fi
}

check_pnpm() {
    if command_exists pnpm; then
        print_success "pnpm: $(pnpm --version)"
        return 0
    elif command_exists npm; then
        print_warning "pnpm not found, using npm"
        return 0
    else
        print_error "No package manager found"
        return 1
    fi
}

check_dependencies() {
    print_header "=== Checking Dependencies ==="
    check_node || return 1
    check_pnpm || return 1
    print_success "All dependencies available"
}

# ============== Installation ==============
install_backend() {
    print_header "=== Installing Backend ==="
    cd "$BACKEND_DIR"
    if command_exists pnpm; then
        pnpm install
    else
        npm install
    fi
    print_success "Backend installed"
}

install_frontend() {
    print_header "=== Installing Frontend ==="
    cd "$FRONTEND_DIR"
    if command_exists pnpm; then
        pnpm install
    else
        npm install
    fi
    print_success "Frontend installed"
}

# ============== Backend ==============
start_backend() {
    local port=${1:-$DEFAULT_BACKEND_PORT}
    local mode=${2:-dev}
    local bg=${3:-false}
    
    # Check if port is in use and prompt user
    if is_port_in_use "$port"; then
        local existing_pid=$(get_pid_by_port "$port")
        print_warning "Port $port is already in use (PID: $existing_pid)"
        
        if [ "$bg" != "interactive" ]; then
            read -p "Kill existing process and continue? (y/n): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_error "Cannot start backend - port in use"
                return 1
            fi
            kill_process_safe "$existing_pid" "backend" || true
            sleep 2
        else
            # In background mode, auto-find next port
            print_warning "Finding next available port..."
            port=$(get_available_port "$port") || port=$((port + 1000))
            print_status "Using port $port"
        fi
    fi
    
    export PORT="$port"
    export BACKEND_PORT="$port"
    export NODE_ENV="$mode"
    
    cd "$BACKEND_DIR"
    
    if [ "$mode" = "prod" ]; then
        # Production mode - build and start
        if [ ! -d "node_modules" ]; then
            print_status "Installing dependencies..."
            command_exists pnpm && pnpm install || npm install
        fi
        
        print_status "Building for production..."
        command_exists pnpm && pnpm run build || npm run build 2>/dev/null || true
        
        export NODE_ENV=production
        command_exists pnpm && pnpm start > "$LOG_DIR/backend.log" 2>&1 &
        npm start > "$LOG_DIR/backend.log" 2>&1 &
    else
        # Development mode
        if [ ! -d "node_modules" ]; then
            print_status "Installing dependencies..."
            command_exists pnpm && pnpm install || npm install
        fi
        
        command_exists pnpm && pnpm run dev > "$LOG_DIR/backend.log" 2>&1 &
        npm run dev > "$LOG_DIR/backend.log" 2>&1 &
    fi
    
    local pid=$!
    echo "$pid" > "$SCRIPT_DIR/backend.pid"
    echo "$port" > "$SCRIPT_DIR/backend.port"
    echo "$mode" > "$SCRIPT_DIR/backend.mode"
    
    print_success "Backend started (PID: $pid, Port: $port, Mode: $mode)"
    
    if [ "$bg" != "true" ] && [ "$bg" != "interactive" ]; then
        wait_for_url "http://localhost:$port/health" "Backend" || true
        print_status "Backend URL: http://localhost:$port"
    fi
    
    return 0
}

stop_backend() {
    print_header "=== Stopping Backend ==="
    
    cleanup_stale_pid "$SCRIPT_DIR/backend.pid" "Backend"
    
    # Read port from file or use default
    local port=$(cat "$SCRIPT_DIR/backend.port" 2>/dev/null || echo "$DEFAULT_BACKEND_PORT")
    
    # Kill by PID file
    if [ -f "$SCRIPT_DIR/backend.pid" ]; then
        local pid=$(cat "$SCRIPT_DIR/backend.pid")
        kill_process_safe "$pid" "backend" || true
        rm -f "$SCRIPT_DIR/backend.pid"
    fi
    
    # Kill by port
    stop_service_by_port "$port" "backend"
    stop_service_by_port "$DEFAULT_BACKEND_PORT" "backend"
    
    rm -f "$SCRIPT_DIR/backend.port"
    print_success "Backend stopped"
}

status_backend() {
    local port=$(cat "$SCRIPT_DIR/backend.port" 2>/dev/null || echo "$DEFAULT_BACKEND_PORT")
    
    if is_port_in_use "$port"; then
        local pid=$(get_pid_by_port "$port")
        print_success "Backend: Running (PID: $pid, Port: $port)"
        return 0
    fi
    print_warning "Backend: Not running"
    return 1
}

# ============== Frontend Dev ==============
start_frontend_dev() {
    local port=${1:-$DEFAULT_FRONTEND_PORT}
    local bg=${2:-false}
    
    # Find available port
    if is_port_in_use "$port"; then
        print_warning "Port $port in use, finding next available..."
        port=$(get_available_port "$port") || port=$((port + 1000))
        print_status "Using port $port"
    fi
    
    export VITE_PORT="$port"
    export FRONTEND_PORT="$port"
    
    cd "$WEB_LUME_DIR"
    
    # Remove strictPort and set port in config
    if command_exists pnpm; then
        pnpm run dev > "$LOG_DIR/frontend.log" 2>&1 &
    else
        npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
    fi
    
    local pid=$!
    echo "$pid" > "$SCRIPT_DIR/frontend.pid"
    
    # Wait a bit and detect actual port from output
    sleep 3
    local actual_port=$(grep -oP "Local:.*:(\d+)" "$LOG_DIR/frontend.log" 2>/dev/null | grep -oP "\d+" | head -1)
    if [ -n "$actual_port" ]; then
        port=$actual_port
    fi
    
    echo "$port" > "$SCRIPT_DIR/frontend.port"
    
    print_success "Frontend started (PID: $pid, Port: $port)"
    
    if [ "$bg" != "true" ]; then
        wait_for_url "http://localhost:$port" "Frontend" || true
        print_status "Frontend URL: http://localhost:$port"
    fi
    
    return 0
}

# ============== Frontend Production ==============
build_frontend() {
    print_header "=== Building Frontend ==="
    cd "$WEB_LUME_DIR"
    
    if command_exists pnpm; then
        pnpm run build
    else
        npm run build
    fi
    
    print_success "Frontend built: $WEB_LUME_DIR/dist"
}

start_frontend_prod() {
    local port=${1:-$DEFAULT_FRONTEND_PREVIEW_PORT}
    local bg=${2:-false}
    
    # Build first if needed
    if [ ! -d "$WEB_LUME_DIR/dist" ]; then
        build_frontend
    fi
    
    # Find available port
    if is_port_in_use "$port"; then
        print_warning "Port $port in use, finding next available..."
        port=$(get_available_port "$port") || port=$((port + 1000))
        print_status "Using port $port"
    fi
    
    cd "$WEB_LUME_DIR"
    
    if command_exists pnpm; then
        pnpm run preview -- --host 0.0.0.0 --port "$port" > "$LOG_DIR/frontend-prod.log" 2>&1 &
    else
        npm run preview -- --host 0.0.0.0 --port "$port" > "$LOG_DIR/frontend-prod.log" 2>&1 &
    fi
    
    local pid=$!
    echo "$pid" > "$SCRIPT_DIR/frontend-prod.pid"
    echo "$port" > "$SCRIPT_DIR/frontend-prod.port"
    
    print_success "Frontend prod started (PID: $pid, Port: $port)"
    
    if [ "$bg" != "true" ]; then
        wait_for_url "http://localhost:$port" "Frontend" || true
    fi
    
    return 0
}

stop_frontend() {
    print_header "=== Stopping Frontend ==="
    
    cleanup_stale_pid "$SCRIPT_DIR/frontend.pid" "Frontend"
    cleanup_stale_pid "$SCRIPT_DIR/frontend-prod.pid" "Frontend-prod"
    
    # Kill dev
    if [ -f "$SCRIPT_DIR/frontend.pid" ]; then
        local pid=$(cat "$SCRIPT_DIR/frontend.pid")
        kill_process_safe "$pid" "vite" || true
        rm -f "$SCRIPT_DIR/frontend.pid"
    fi
    
    # Kill prod
    if [ -f "$SCRIPT_DIR/frontend-prod.pid" ]; then
        local pid=$(cat "$SCRIPT_DIR/frontend-prod.pid")
        kill_process_safe "$pid" "vite" || true
        rm -f "$SCRIPT_DIR/frontend-prod.pid"
    fi
    
    # Kill by port
    local port=$(cat "$SCRIPT_DIR/frontend.port" 2>/dev/null || echo "$DEFAULT_FRONTEND_PORT")
    stop_service_by_port "$port" "vite"
    stop_service_by_port "$DEFAULT_FRONTEND_PORT" "vite"
    
    local prod_port=$(cat "$SCRIPT_DIR/frontend-prod.port" 2>/dev/null || echo "$DEFAULT_FRONTEND_PREVIEW_PORT")
    stop_service_by_port "$prod_port" "vite"
    
    rm -f "$SCRIPT_DIR/frontend.port" "$SCRIPT_DIR/frontend-prod.port"
    print_success "Frontend stopped"
}

status_frontend() {
    local port=$(cat "$SCRIPT_DIR/frontend.port" 2>/dev/null || echo "$DEFAULT_FRONTEND_PORT")
    local prod_port=$(cat "$SCRIPT_DIR/frontend-prod.port" 2>/dev/null || echo "$DEFAULT_FRONTEND_PREVIEW_PORT")
    
    if is_port_in_use "$port"; then
        local pid=$(get_pid_by_port "$port")
        print_success "Frontend (dev): Running (PID: $pid, Port: $port)"
    elif is_port_in_use "$prod_port"; then
        local pid=$(get_pid_by_port "$prod_port")
        print_success "Frontend (prod): Running (PID: $pid, Port: $prod_port)"
    else
        print_warning "Frontend: Not running"
    fi
}

# ============== All Services ==============
start_all() {
    local mode=${1:-dev}
    local bg=${2:-false}
    
    mkdir -p "$LOG_DIR"
    
    start_backend 3000 "$bg"
    sleep 2
    
    if [ "$mode" = "prod" ]; then
        start_frontend_prod 4173 "$bg"
    else
        start_frontend_dev 5173 "$bg"
    fi
    
    local be_port=$(cat "$SCRIPT_DIR/backend.port" 2>/dev/null || echo 3000)
    local fe_port=$(cat "$SCRIPT_DIR/frontend.port" 2>/dev/null || echo 5173)
    local fe_prod_port=$(cat "$SCRIPT_DIR/frontend-prod.port" 2>/dev/null || echo 4173)
    
    echo ""
    echo "=========================================="
    echo "         LUME Services Started"
    echo "=========================================="
    echo "  Backend:      http://localhost:$be_port"
    if [ "$mode" = "prod" ]; then
        echo "  Frontend:     http://localhost:$fe_prod_port"
    else
        echo "  Frontend:     http://localhost:$fe_port"
    fi
    echo "=========================================="
}

stop_all() {
    print_header "=== Stopping All Services ==="
    stop_backend
    stop_frontend
    print_success "All services stopped"
}

status_all() {
    print_header "=== Service Status ==="
    status_backend
    status_frontend
}

logs_backend() {
    local tail_flag="${1:-}"
    
    if [ -f "$LOG_DIR/backend.log" ]; then
        if [ "$tail_flag" = "-f" ]; then
            print_status "Tailing backend logs (Ctrl+C to exit)..."
            tail -f "$LOG_DIR/backend.log"
        else
            tail -50 "$LOG_DIR/backend.log"
        fi
    else
        print_warning "Backend log not found"
    fi
}

logs_frontend() {
    local tail_flag="${1:-}"
    
    if [ -f "$LOG_DIR/frontend.log" ]; then
        if [ "$tail_flag" = "-f" ]; then
            print_status "Tailing frontend logs (Ctrl+C to exit)..."
            tail -f "$LOG_DIR/frontend.log"
        else
            tail -50 "$LOG_DIR/frontend.log"
        fi
    elif [ -f "$LOG_DIR/frontend-prod.log" ]; then
        if [ "$tail_flag" = "-f" ]; then
            print_status "Tailing frontend-prod logs (Ctrl+C to exit)..."
            tail -f "$LOG_DIR/frontend-prod.log"
        else
            tail -50 "$LOG_DIR/frontend-prod.log"
        fi
    else
        print_warning "Frontend log not found"
    fi
}

logs() {
    local service="${1:-}"
    local tail_flag="${2:-}"
    
    case "$service" in
        backend|be)
            logs_backend "$tail_flag"
            ;;
        frontend|fe)
            logs_frontend "$tail_flag"
            ;;
        -f)
            logs_backend "-f"
            echo ""
            logs_frontend "-f"
            ;;
        "")
            echo "=== Backend Logs ==="
            logs_backend
            echo ""
            echo "=== Frontend Logs ==="
            logs_frontend
            ;;
        *)
            print_error "Unknown service: $service. Use: backend, frontend, or no argument for all"
            ;;
    esac
}

# ============== Help ==============
show_help() {
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}         LUME Management Script${NC}"
    echo -e "${CYAN}============================================${NC}"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo -e "${YELLOW}Commands:${NC}"
    echo "  start [dev|prod]       Start services (default: dev)"
    echo "  stop                    Stop all services"
    echo "  restart [dev|prod]     Restart services"
    echo "  status                  Show service status"
    echo "  logs [service] [-f]     Show logs (use -f to tail, service: backend/frontend)"
    echo "  install                 Install all dependencies"
    echo "  build                   Build frontend"
    echo "  check                   Check dependencies"
    echo "  help                    Show this help"
    echo ""
    echo -e "${YELLOW}Service Commands:${NC}"
    echo "  start backend [port]    Start only backend"
    echo "  start frontend [port]   Start only frontend"
    echo "  stop backend            Stop only backend"
    echo "  stop frontend           Stop only frontend"
    echo ""
    echo -e "${YELLOW}Options:${NC}"
    echo "  -b, --background       Run in background"
    echo "  -p, --port PORT        Specify port"
    echo "  -h, --help            Show help"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 start                   # Start dev servers"
    echo "  $0 start prod             # Start production"
    echo "  $0 start backend 3001     # Start backend on port 3001"
    echo "  $0 start frontend        # Start only frontend"
    echo "  $0 start -b              # Start in background"
    echo "  $0 stop                  # Stop all"
    echo "  $0 restart               # Restart dev"
    echo "  $0 logs                  # View all logs"
    echo "  $0 logs backend -f       # Tail backend logs"
    echo "  $0 logs frontend         # View frontend logs"
    echo ""
}

# ============== Main ==============
COMMAND=""
MODE="dev"
SUBCOMMAND=""
BACKGROUND=false
PORT=""

while [[ $# -gt 0 ]]; do
    case $1 in
        start|stop|restart|status|logs|install|build|check|help)
            COMMAND="$1"
            shift
            ;;
        backend|be)
            SUBCOMMAND="backend"
            shift
            ;;
        frontend|fe)
            SUBCOMMAND="frontend"
            shift
            ;;
        dev|prod)
            MODE="$1"
            shift
            ;;
        -b|--background)
            BACKGROUND=true
            shift
            ;;
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -f)
            # For logs command
            if [ "$COMMAND" = "logs" ]; then
                PORT="-f"
            fi
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            # Check if it's a port number
            if [[ "$1" =~ ^[0-9]+$ ]]; then
                PORT="$1"
                shift
            else
                print_error "Unknown option: $1"
                show_help
                exit 1
            fi
            ;;
    esac
done

# Execute command
case $COMMAND in
    check)
        check_dependencies
        ;;
    install)
        mkdir -p "$LOG_DIR"
        install_backend
        install_frontend
        ;;
    build)
        mkdir -p "$LOG_DIR"
        build_frontend
        ;;
    start)
        # Handle subcommands
        if [ "$SUBCOMMAND" = "backend" ]; then
            start_backend "${PORT:-3000}" "$MODE" "$BACKGROUND"
        elif [ "$SUBCOMMAND" = "frontend" ]; then
            if [ "$MODE" = "prod" ]; then
                start_frontend_prod "${PORT:-4173}" "$BACKGROUND"
            else
                start_frontend_dev "${PORT:-5173}" "$BACKGROUND"
            fi
        else
            if [ "$MODE" = "prod" ]; then
                start_all prod "$BACKGROUND"
            else
                start_all dev "$BACKGROUND"
            fi
        fi
        ;;
    stop)
        if [ "$SUBCOMMAND" = "backend" ]; then
            stop_backend
        elif [ "$SUBCOMMAND" = "frontend" ]; then
            stop_frontend
        else
            stop_all
        fi
        ;;
    restart)
        if [ "$SUBCOMMAND" = "backend" ]; then
            stop_backend
            sleep 2
            start_backend "${PORT:-3000}" "$MODE" "$BACKGROUND"
        elif [ "$SUBCOMMAND" = "frontend" ]; then
            stop_frontend
            sleep 2
            if [ "$MODE" = "prod" ]; then
                start_frontend_prod "${PORT:-4173}" "$BACKGROUND"
            else
                start_frontend_dev "${PORT:-5173}" "$BACKGROUND"
            fi
        else
            stop_all
            sleep 2
            start_all "$MODE" "$BACKGROUND"
        fi
        ;;
    status)
        if [ "$SUBCOMMAND" = "backend" ]; then
            status_backend
        elif [ "$SUBCOMMAND" = "frontend" ]; then
            status_frontend
        else
            status_all
        fi
        ;;
    logs)
        logs "$SUBCOMMAND" "$PORT"
        ;;
    help)
        show_help
        ;;
    "")
        show_help
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac
