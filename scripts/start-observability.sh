#!/bin/bash

# ============================================================================
# Lume Framework - Local Observability Stack Starter
# ============================================================================
# This script starts the complete observability stack for local development:
# - Prometheus (metrics collection)
# - Grafana (metric visualization)
# - Jaeger (distributed tracing)
# - Elasticsearch & Kibana (log aggregation)
# - AlertManager (alert routing)
# - Loki (log aggregation - alternative to ELK)
# - Redis (cache & session store)
# - MySQL (development database)
# - OpenTelemetry Collector (telemetry aggregation)
#
# Usage:
#   ./scripts/start-observability.sh          # Start full stack
#   ./scripts/start-observability.sh stop      # Stop stack
#   ./scripts/start-observability.sh logs      # Show logs
#   ./scripts/start-observability.sh reset     # Reset and start fresh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.observability.yml"
ENV_FILE="$PROJECT_ROOT/.env.local"

# Command to run (start, stop, logs, reset, etc.)
COMMAND="${1:-start}"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

log_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

log_success() {
    echo -e "${GREEN}✓ ${NC}$1"
}

log_warning() {
    echo -e "${YELLOW}⚠ ${NC}$1"
}

log_error() {
    echo -e "${RED}✗ ${NC}$1"
}

log_section() {
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

check_prerequisites() {
    log_section "Checking Prerequisites"

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker Desktop."
        exit 1
    fi
    log_success "Docker is installed ($(docker --version))"

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose."
        exit 1
    fi
    log_success "Docker Compose is available"

    # Check Docker daemon
    if ! docker ps &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker Desktop."
        exit 1
    fi
    log_success "Docker daemon is running"

    # Check compose file exists
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "docker-compose.observability.yml not found at $COMPOSE_FILE"
        exit 1
    fi
    log_success "Docker Compose file found"

    # Create .env.local if it doesn't exist
    if [ ! -f "$ENV_FILE" ]; then
        log_warning ".env.local not found, creating from .env.local.example"
        if [ -f "$PROJECT_ROOT/.env.local.example" ]; then
            cp "$PROJECT_ROOT/.env.local.example" "$ENV_FILE"
            log_success "Created .env.local (use default values for local dev)"
        else
            log_warning "Could not find .env.local.example, proceeding with defaults"
        fi
    fi
}

start_stack() {
    log_section "Starting Observability Stack"

    log_info "Starting services with docker-compose..."
    cd "$PROJECT_ROOT"

    if docker-compose -f "$COMPOSE_FILE" up -d 2>/dev/null || \
       docker compose -f "$COMPOSE_FILE" up -d; then
        log_success "Docker Compose up command completed"
    else
        log_error "Failed to start containers"
        exit 1
    fi

    log_info "Waiting for services to be healthy..."
    wait_for_services

    log_success "Observability stack is running!"
}

wait_for_services() {
    local max_attempts=60
    local attempt=0

    declare -A services=(
        [prometheus]="http://localhost:9090/-/healthy"
        [grafana]="http://localhost:3000/api/health"
        [jaeger]="http://localhost:16686"
        [elasticsearch]="http://localhost:9200/_cluster/health"
        [loki]="http://localhost:3100/ready"
        [alertmanager]="http://localhost:9093/-/healthy"
    )

    log_info "Checking service health..."

    for service in "${!services[@]}"; do
        local url="${services[$service]}"
        local attempt=0

        while [ $attempt -lt $max_attempts ]; do
            if curl -sf "$url" > /dev/null 2>&1; then
                log_success "$service is healthy"
                break
            fi

            attempt=$((attempt + 1))
            if [ $attempt -eq $max_attempts ]; then
                log_warning "$service did not become healthy (may need more time)"
            else
                sleep 1
            fi
        done
    done
}

stop_stack() {
    log_section "Stopping Observability Stack"

    cd "$PROJECT_ROOT"

    if docker-compose -f "$COMPOSE_FILE" down 2>/dev/null || \
       docker compose -f "$COMPOSE_FILE" down; then
        log_success "Stack stopped"
    else
        log_warning "Could not stop stack gracefully"
    fi
}

reset_stack() {
    log_section "Resetting Observability Stack"

    log_warning "This will remove all containers and volumes"
    read -p "Are you sure? (yes/no): " -r
    echo
    if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        cd "$PROJECT_ROOT"

        if docker-compose -f "$COMPOSE_FILE" down -v 2>/dev/null || \
           docker compose -f "$COMPOSE_FILE" down -v; then
            log_success "Stack reset (all data cleared)"
            start_stack
        else
            log_error "Failed to reset stack"
            exit 1
        fi
    else
        log_info "Reset cancelled"
    fi
}

show_logs() {
    log_section "Observability Stack Logs"

    local service="${2:-}"
    cd "$PROJECT_ROOT"

    if [ -z "$service" ]; then
        log_info "Showing logs from all services (Ctrl+C to stop)"
        if docker-compose -f "$COMPOSE_FILE" logs -f 2>/dev/null; then
            :
        else
            docker compose -f "$COMPOSE_FILE" logs -f
        fi
    else
        log_info "Showing logs from $service (Ctrl+C to stop)"
        if docker-compose -f "$COMPOSE_FILE" logs -f "$service" 2>/dev/null; then
            :
        else
            docker compose -f "$COMPOSE_FILE" logs -f "$service"
        fi
    fi
}

show_status() {
    log_section "Observability Stack Status"

    cd "$PROJECT_ROOT"

    if docker-compose -f "$COMPOSE_FILE" ps 2>/dev/null; then
        :
    else
        docker compose -f "$COMPOSE_FILE" ps
    fi
}

print_access_info() {
    log_section "Access Observability Services"

    cat << 'EOF'
┌─────────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY ENDPOINTS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📊 GRAFANA (Dashboards)                                        │
│     URL: http://localhost:3000                                  │
│     Username: admin                                             │
│     Password: admin                                             │
│                                                                 │
│  📈 PROMETHEUS (Metrics)                                        │
│     URL: http://localhost:9090                                  │
│     Query Endpoint: /api/v1/query                               │
│                                                                 │
│  🔍 JAEGER (Traces)                                             │
│     URL: http://localhost:16686                                 │
│     gRPC Endpoint: localhost:14250                              │
│                                                                 │
│  📋 KIBANA (Logs - ELK)                                         │
│     URL: http://localhost:5601                                  │
│     Elasticsearch: http://localhost:9200                        │
│                                                                 │
│  📝 LOKI (Logs - Alternative)                                   │
│     URL: http://localhost:3100                                  │
│     Push Endpoint: /loki/api/v1/push                            │
│                                                                 │
│  ⚠️  ALERTMANAGER (Alerts)                                      │
│     URL: http://localhost:9093                                  │
│     API: /api/v1/alerts                                         │
│                                                                 │
│  💾 REDIS (Cache & Queue)                                       │
│     Host: localhost:6379                                        │
│     Password: redis123                                          │
│                                                                 │
│  🗄️  MYSQL (Database)                                           │
│     Host: localhost:3306                                        │
│     User: lume_dev / Password: lume123                          │
│     Database: lume_dev                                          │
│                                                                 │
│  🔄 OTEL COLLECTOR                                              │
│     gRPC: localhost:4317                                        │
│     HTTP: localhost:4318                                        │
│     Prometheus Metrics: http://localhost:8888/metrics           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
EOF
}

print_next_steps() {
    log_section "Next Steps"

    cat << 'EOF'
1. Run your Lume backend application:
   npm run dev          # or your dev command

2. Make some test requests:
   curl http://localhost:3000/api/base/health
   curl http://localhost:3000/api/users
   curl http://localhost:3000/metrics

3. View metrics in Grafana:
   - Open http://localhost:3000
   - Sign in with admin/admin
   - Create a dashboard using Prometheus datasource

4. View traces in Jaeger:
   - Open http://localhost:16686
   - Select service: lume-backend
   - Click "Find Traces"

5. Search logs in Kibana:
   - Open http://localhost:5601
   - Create index pattern: logs-*
   - Explore logs in Discover tab

6. View alerts in AlertManager:
   - Open http://localhost:9093
   - Trigger test alert: curl -XPOST http://localhost:9093/api/v1/alerts...

7. Monitor logs with Loki:
   - Query in Grafana Explore tab
   - Or at http://localhost:3100

For detailed information, see:
   docs/LOCAL_DEVELOPMENT.md
   docs/observability/OBSERVABILITY_ARCHITECTURE.md
EOF
}

help_message() {
    cat << 'EOF'
USAGE:
  ./scripts/start-observability.sh [COMMAND]

COMMANDS:
  start   - Start the observability stack (default)
  stop    - Stop the stack
  reset   - Reset stack (remove containers and volumes)
  logs    - Show logs from all services
  status  - Show running containers
  help    - Show this help message

EXAMPLES:
  ./scripts/start-observability.sh                # Start stack
  ./scripts/start-observability.sh stop           # Stop stack
  ./scripts/start-observability.sh logs           # Show all logs
  ./scripts/start-observability.sh logs prometheus # Show prometheus logs only
  ./scripts/start-observability.sh reset          # Full reset
  ./scripts/start-observability.sh status         # Check status

ENVIRONMENT:
  Set COMPOSE_PROJECT_NAME to customize container names:
    export COMPOSE_PROJECT_NAME=my-lume
    ./scripts/start-observability.sh

EOF
}

# ============================================================================
# MAIN SCRIPT
# ============================================================================

case "$COMMAND" in
    start)
        check_prerequisites
        start_stack
        print_access_info
        print_next_steps
        ;;
    stop)
        stop_stack
        ;;
    reset)
        reset_stack
        print_access_info
        ;;
    logs)
        show_logs "$@"
        ;;
    status)
        show_status
        ;;
    help|--help|-h)
        help_message
        ;;
    *)
        log_error "Unknown command: $COMMAND"
        help_message
        exit 1
        ;;
esac

exit 0
