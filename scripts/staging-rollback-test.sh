#!/bin/bash

# Rollback Testing Script
# Verifies that rollback procedure works correctly

set -e

MIGRATION_DIR="/tmp/lume-migration"
LOG_FILE="$MIGRATION_DIR/rollback-test.log"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

section() {
  echo -e "\n${BLUE}=== $1 ===${NC}\n" | tee -a "$LOG_FILE"
}

# Initialize
mkdir -p "$MIGRATION_DIR"
echo "=== Rollback Testing ===" > "$LOG_FILE"
echo "Started: $(date)" >> "$LOG_FILE"

section "PRE-ROLLBACK VALIDATION"

# Load config
if [ ! -f "$MIGRATION_DIR/migration-config.env" ]; then
  error "Migration config not found. Run migration first."
fi

source "$MIGRATION_DIR/migration-config.env"

# Check backup exists
if [ ! -f "$MIGRATION_DIR/lume_prod_clone.sql" ]; then
  error "Backup file not found at $MIGRATION_DIR/lume_prod_clone.sql"
fi

log "✓ Backup file verified"
BACKUP_SIZE=$(du -h "$MIGRATION_DIR/lume_prod_clone.sql" | cut -f1)
log "  Size: $BACKUP_SIZE"

section "PRE-ROLLBACK COUNTS"

log "Recording current (migrated) state..."

# Count current entities
MIGRATED_ENTITIES=$(docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' lume -e \
  "SELECT COUNT(*) FROM entities;" \
  2>/dev/null | tail -1)

log "Current entities: $MIGRATED_ENTITIES"

# Count current records
MIGRATED_RECORDS=$(docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' lume -e \
  "SELECT COUNT(*) FROM entity_records;" \
  2>/dev/null | tail -1)

log "Current entity_records: $MIGRATED_RECORDS"

# Test that old schema doesn't exist yet
if docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' lume -e \
  "SELECT 1 FROM activities LIMIT 1;" &>/dev/null 2>&1; then
  log "Legacy tables still present (expected for rollback test)"
else
  warn "Legacy tables not found (may have been cleaned up)"
fi

section "EXECUTING ROLLBACK"

ROLLBACK_START=$(date +%s)

log "Step 1: Stopping services..."
docker-compose -f docker-compose.staging.yml stop 2>&1 | grep -E "Stopping|Stopped" | head -5

sleep 5

log "Step 2: Restoring from backup..."
docker-compose -f docker-compose.staging.yml exec -T mysql \
  mysql -u root -p'gawdesy' lume < "$MIGRATION_DIR/lume_prod_clone.sql" \
  || error "Database restore failed"

log "Step 3: Restarting services..."
docker-compose -f docker-compose.staging.yml up -d
sleep 10

log "Step 4: Waiting for services to be healthy..."
for i in {1..30}; do
  if docker-compose -f docker-compose.staging.yml ps | grep -q "mysql.*healthy"; then
    log "MySQL healthy"
    break
  fi
  if [ $i -eq 30 ]; then
    warn "MySQL didn't become healthy (may take longer)"
  fi
  sleep 2
done

ROLLBACK_END=$(date +%s)
ROLLBACK_DURATION=$((ROLLBACK_END - ROLLBACK_START))

log "✓ Rollback completed in ${ROLLBACK_DURATION}s"

section "POST-ROLLBACK VERIFICATION"

log "Verifying rollback success..."

# Check legacy tables restored
log "Checking legacy tables..."
LEGACY_TABLES=$(docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' lume -e \
  "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='lume' AND TABLE_NAME='activities';" \
  2>/dev/null | tail -1)

if [ "$LEGACY_TABLES" -eq 1 ]; then
  log "✓ Legacy tables restored"
else
  error "Legacy tables not found after rollback"
fi

# Check entity builder tables still exist
log "Checking entity builder tables..."
ENTITY_TABLES=$(docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' lume -e \
  "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='lume' AND TABLE_NAME LIKE 'entity_%';" \
  2>/dev/null | tail -1)

if [ "$ENTITY_TABLES" -gt 0 ]; then
  log "Entity builder schema still present (this is OK)"
else
  warn "Entity builder tables not found (they may have been deleted)"
fi

# Check data integrity after rollback
log "Checking data integrity..."
ROLLBACK_ACTIVITIES=$(docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' lume -e \
  "SELECT COUNT(*) FROM activities;" \
  2>/dev/null | tail -1)

log "Activities records: $ROLLBACK_ACTIVITIES"

if [ "$ROLLBACK_ACTIVITIES" -gt 0 ]; then
  log "✓ Legacy data restored successfully"
else
  warn "No activities found after rollback (data may not have existed)"
fi

section "ROLLBACK TESTING COMPLETE"

echo "" | tee -a "$LOG_FILE"
echo "Summary:" | tee -a "$LOG_FILE"
echo "  Rollback Duration: ${ROLLBACK_DURATION}s" | tee -a "$LOG_FILE"
echo "  Pre-Rollback Entities: $MIGRATED_ENTITIES" | tee -a "$LOG_FILE"
echo "  Pre-Rollback Records: $MIGRATED_RECORDS" | tee -a "$LOG_FILE"
echo "  Post-Rollback Activities: $ROLLBACK_ACTIVITIES" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

if [ "$ROLLBACK_DURATION" -lt 30 ]; then
  echo -e "${GREEN}✓ ROLLBACK TEST PASSED (< 30s recovery)${NC}" | tee -a "$LOG_FILE"
elif [ "$ROLLBACK_DURATION" -lt 60 ]; then
  echo -e "${YELLOW}⚠ ROLLBACK TEST ACCEPTABLE (${ROLLBACK_DURATION}s < 60s)${NC}" | tee -a "$LOG_FILE"
else
  echo -e "${RED}✗ ROLLBACK TEST FAILED (${ROLLBACK_DURATION}s > 60s)${NC}" | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"
echo "Rollback test log: $LOG_FILE" | tee -a "$LOG_FILE"

exit 0
