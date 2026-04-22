#!/bin/bash

# Staging Migration Setup Script
# Prepares environment for Phase 2 database migration testing

set -e  # Exit on error

MIGRATION_DIR="/tmp/lume-migration"
LOG_FILE="$MIGRATION_DIR/setup.log"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
  exit 1
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

# Create migration directory
mkdir -p "$MIGRATION_DIR"
echo "=== Lume Staging Migration Setup ===" > "$LOG_FILE"
echo "Started: $TIMESTAMP" >> "$LOG_FILE"

log "Phase 2 Staging Migration Setup"
log "================================"

# Step 1: Verify Docker services
log "Step 1: Verifying Docker environment..."

if ! command -v docker &> /dev/null; then
  error "Docker not found. Please install Docker."
fi

if ! command -v docker-compose &> /dev/null; then
  error "Docker Compose not found. Please install Docker Compose."
fi

log "✓ Docker and Docker Compose installed"

# Step 2: Start staging environment
log "Step 2: Starting staging environment..."

cd /opt/Lume

if docker-compose -f docker-compose.staging.yml ps | grep -q "Exit"; then
  log "Some services stopped. Removing and restarting..."
  docker-compose -f docker-compose.staging.yml down
fi

docker-compose -f docker-compose.staging.yml up -d
sleep 10

# Check service health
HEALTH_CHECK=$(docker-compose -f docker-compose.staging.yml ps | grep "unhealthy" || echo "")
if [ -n "$HEALTH_CHECK" ]; then
  warn "Some services may still be starting. Waiting 30 seconds..."
  sleep 30
fi

log "✓ Staging services started"

# Step 3: Verify MySQL connectivity
log "Step 3: Verifying database connectivity..."

MAX_RETRIES=10
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
  if docker-compose -f docker-compose.staging.yml exec -T mysql mysql -u root -p'gawdesy' -e "SELECT 1;" &>/dev/null; then
    log "✓ Database connectivity verified"
    break
  fi
  RETRY=$((RETRY + 1))
  if [ $RETRY -eq $MAX_RETRIES ]; then
    error "Failed to connect to database after $MAX_RETRIES attempts"
  fi
  sleep 5
done

# Step 4: Clone production database
log "Step 4: Cloning production database to staging..."

if docker-compose -f docker-compose.prod.yml ps | grep -q "healthy"; then
  log "Production environment detected. Creating backup..."

  docker-compose -f docker-compose.prod.yml exec -T mysql \
    mysqldump -u root -p'gawdesy' \
    --single-transaction \
    --quick \
    --lock-tables=false \
    lume > "$MIGRATION_DIR/lume_prod_clone.sql"

  SIZE=$(du -h "$MIGRATION_DIR/lume_prod_clone.sql" | cut -f1)
  log "✓ Production database backup created ($SIZE)"

  # Restore to staging
  log "Restoring backup to staging..."
  docker-compose -f docker-compose.staging.yml exec -T mysql \
    mysql -u root -p'gawdesy' lume < "$MIGRATION_DIR/lume_prod_clone.sql"

  log "✓ Database restored to staging"
else
  warn "Production environment not running. Skipping production clone."
  warn "Ensure staging database has legacy data for migration testing."
fi

# Step 5: Verify entity builder schema
log "Step 5: Verifying Entity Builder schema..."

TABLES=$(docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' lume -e \
  "SELECT GROUP_CONCAT(TABLE_NAME) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='lume' AND TABLE_NAME IN ('entities', 'entity_fields', 'entity_views', 'entity_records');" \
  2>/dev/null | tail -1 || echo "")

if [ -z "$TABLES" ]; then
  warn "Entity Builder tables not found. These will be created during migration."
else
  log "✓ Entity Builder schema verified: $TABLES"
fi

# Step 6: Count legacy tables
log "Step 6: Analyzing legacy schema..."

LEGACY_COUNT=$(docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' lume -e \
  "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='lume' AND TABLE_NAME NOT LIKE 'entity_%' AND TABLE_NAME NOT IN ('users', 'roles', 'permissions', 'role_permissions', 'settings', 'audit_logs', 'installed_modules', 'menu', 'groups', 'record_rules', 'sequences');" \
  2>/dev/null | tail -1)

log "✓ Legacy tables found: $LEGACY_COUNT"
echo "LEGACY_TABLE_COUNT=$LEGACY_COUNT" >> "$MIGRATION_DIR/migration-config.env"

# Step 7: Create migration logs directory
log "Step 7: Setting up log directories..."

mkdir -p /opt/Lume/logs
chmod 777 /opt/Lume/logs
log "✓ Log directories created"

# Step 8: Verify migration scripts
log "Step 8: Verifying migration scripts..."

if [ ! -f "/opt/Lume/scripts/migrate-to-entity-builder.js" ]; then
  error "Migration script not found"
fi

if [ ! -f "/opt/Lume/scripts/validate-migration.js" ]; then
  error "Validation script not found"
fi

if [ ! -f "/opt/Lume/scripts/load-test.js" ]; then
  error "Load test script not found"
fi

log "✓ All migration scripts present"

# Step 9: Create backup of staging config
log "Step 9: Creating configuration backup..."

docker-compose -f docker-compose.staging.yml config > "$MIGRATION_DIR/docker-compose.staging.backup.yml"
log "✓ Staging configuration backed up"

# Step 10: Summary
log ""
log "=== Setup Complete ==="
log "Staging environment ready for Phase 2 migration"
log ""
log "Configuration saved to: $MIGRATION_DIR"
log "Legacy tables to migrate: $LEGACY_COUNT"
log ""
log "Next steps:"
log "1. Review migration plan: cat PHASE_2_STAGING_EXECUTION.md"
log "2. Start migration: scripts/staging-migration-execute.sh"
log ""

# Save status
echo "STATUS=READY" >> "$MIGRATION_DIR/migration-config.env"
echo "SETUP_TIMESTAMP=$(date +%s)" >> "$MIGRATION_DIR/migration-config.env"

log "Setup log: $LOG_FILE"
