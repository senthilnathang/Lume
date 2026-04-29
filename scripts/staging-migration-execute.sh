#!/bin/bash

# Staging Migration Execution Script
# Executes Phase 2 database migration in staging environment

set -e

MIGRATION_DIR="/tmp/lume-migration"
LOG_FILE="$MIGRATION_DIR/execution.log"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
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
echo "=== Lume Phase 2 Migration Execution ===" > "$LOG_FILE"
echo "Started: $(date)" >> "$LOG_FILE"

section "PRE-MIGRATION VALIDATION"

# Load config from setup
if [ -f "$MIGRATION_DIR/migration-config.env" ]; then
  source "$MIGRATION_DIR/migration-config.env"
  log "✓ Configuration loaded"
else
  warn "Setup not run. Running setup now..."
  bash scripts/staging-migration-setup.sh
  source "$MIGRATION_DIR/migration-config.env"
fi

if [ "$STATUS" != "READY" ]; then
  error "Environment not ready. Please run: scripts/staging-migration-setup.sh"
fi

log "Legacy tables to migrate: $LEGACY_TABLE_COUNT"

# Verify staging services
log "Verifying staging services..."
if ! docker-compose -f docker-compose.staging.yml ps | grep -q "mysql.*Up"; then
  error "MySQL not running in staging. Start with: docker-compose -f docker-compose.staging.yml up -d"
fi
log "✓ MySQL running"

if ! docker-compose -f docker-compose.staging.yml ps | grep -q "backend.*Up"; then
  error "Backend not running in staging"
fi
log "✓ Backend running"

section "PRE-MIGRATION COUNTS"

# Get table count before migration
log "Counting legacy tables..."
LEGACY_COUNT=$(docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' lume -e \
  "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='lume' AND TABLE_NAME NOT LIKE 'entity_%' AND TABLE_NAME NOT IN ('users', 'roles', 'permissions', 'role_permissions', 'settings', 'audit_logs', 'installed_modules', 'menu', 'groups', 'record_rules', 'sequences');" \
  2>/dev/null | tail -1)

log "Legacy tables: $LEGACY_COUNT"

# Count legacy records
log "Counting legacy records..."
LEGACY_RECORDS=$(docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' lume -e \
  "SELECT SUM(TABLE_ROWS) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='lume' AND TABLE_NAME NOT LIKE 'entity_%' AND TABLE_NAME NOT IN ('users', 'roles', 'permissions', 'role_permissions', 'settings', 'audit_logs', 'installed_modules', 'menu', 'groups', 'record_rules', 'sequences');" \
  2>/dev/null | tail -1)

log "Legacy records: $LEGACY_RECORDS"

section "RUNNING MIGRATION"

log "Starting migration script..."
log "This may take 5-30 minutes depending on data size"

START_TIME=$(date +%s)

cd /opt/Lume

# Run migration
docker-compose -f docker-compose.staging.yml exec backend \
  NODE_OPTIONS='--experimental-vm-modules' \
  node scripts/migrate-to-entity-builder.js run \
  2>&1 | tee "$MIGRATION_DIR/migration_output.log"

MIGRATION_RESULT=${PIPESTATUS[0]}

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [ $MIGRATION_RESULT -eq 0 ]; then
  log "✓ Migration script completed (${DURATION}s)"
else
  error "Migration script failed with exit code $MIGRATION_RESULT"
fi

section "POST-MIGRATION VALIDATION"

# Count entities created
ENTITIES=$(docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' lume -e \
  "SELECT COUNT(*) FROM entities;" \
  2>/dev/null | tail -1)

log "Entities created: $ENTITIES"

if [ "$ENTITIES" -ne "$LEGACY_COUNT" ]; then
  warn "Entity count mismatch: Expected $LEGACY_COUNT, got $ENTITIES"
fi

# Count records migrated
RECORDS=$(docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' lume -e \
  "SELECT COUNT(*) FROM entity_records;" \
  2>/dev/null | tail -1)

log "Records migrated: $RECORDS"

# Count fields created
FIELDS=$(docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' lume -e \
  "SELECT COUNT(*) FROM entity_fields;" \
  2>/dev/null | tail -1)

log "Fields created: $FIELDS"

section "RUNNING DATA INTEGRITY VALIDATION"

log "Starting validation script..."
log "This will check for data consistency and integrity"

docker-compose -f docker-compose.staging.yml exec backend \
  NODE_OPTIONS='--experimental-vm-modules' \
  node scripts/validate-migration.js \
  2>&1 | tee "$MIGRATION_DIR/validation_output.log"

VALIDATION_RESULT=${PIPESTATUS[0]}

# Check validation output for errors
if grep -q "^✗" "$MIGRATION_DIR/validation_output.log"; then
  warn "Some validation checks failed. Review: $MIGRATION_DIR/validation_output.log"
elif [ $VALIDATION_RESULT -ne 0 ]; then
  warn "Validation script exited with code $VALIDATION_RESULT"
else
  log "✓ Validation completed successfully"
fi

section "PERFORMANCE BASELINE"

log "Running baseline performance test..."
log "This tests API response times with migrated data"

docker-compose -f docker-compose.staging.yml exec backend \
  node scripts/load-test.js run \
  --rps=50 \
  --duration=60 \
  2>&1 | tee "$MIGRATION_DIR/load-test-baseline.log"

LOAD_TEST_RESULT=${PIPESTATUS[0]}

if [ $LOAD_TEST_RESULT -eq 0 ]; then
  log "✓ Baseline performance test completed"
else
  warn "Load test exited with code $LOAD_TEST_RESULT"
fi

section "SUMMARY"

echo "" | tee -a "$LOG_FILE"
log "Migration Statistics:"
log "  Entities Created:    $ENTITIES"
log "  Records Migrated:    $RECORDS"
log "  Fields Created:      $FIELDS"
log "  Duration:           ${DURATION}s"
log ""
log "Next Steps:"
log "  1. Review validation results: cat $MIGRATION_DIR/validation_output.log"
log "  2. Review performance results: cat $MIGRATION_DIR/load-test-baseline.log"
log "  3. Run UAT tests manually using PHASE_2_STAGING_EXECUTION.md"
log "  4. Upon success, prepare for Phase 3 (Security & Testing)"
log ""

# Save execution status
echo "MIGRATION_RESULT=$MIGRATION_RESULT" >> "$MIGRATION_DIR/migration-config.env"
echo "VALIDATION_RESULT=$VALIDATION_RESULT" >> "$MIGRATION_DIR/migration-config.env"
echo "EXECUTION_TIMESTAMP=$(date +%s)" >> "$MIGRATION_DIR/migration-config.env"
echo "ENTITIES_CREATED=$ENTITIES" >> "$MIGRATION_DIR/migration-config.env"
echo "RECORDS_MIGRATED=$RECORDS" >> "$MIGRATION_DIR/migration-config.env"
echo "FIELDS_CREATED=$FIELDS" >> "$MIGRATION_DIR/migration-config.env"

log "Complete execution logs in: $MIGRATION_DIR/"
