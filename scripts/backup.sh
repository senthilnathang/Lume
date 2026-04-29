#!/bin/bash

# Lume Framework Database Backup Script
# Automated backup with encryption, compression, and retention management

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_STORAGE_PATH:-/mnt/backups}"
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${MYSQL_USER:-lume_prod}"
DB_PASSWORD="${MYSQL_PASSWORD}"
DB_NAME="${MYSQL_DATABASE:-lume}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Log function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handler
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Create backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/lume_backup_${TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"
ENCRYPTED_FILE="${COMPRESSED_FILE}.enc"

log "Starting database backup..."
log "Database: $DB_NAME"
log "Backup directory: $BACKUP_DIR"

# Create backup
if mysqldump \
    -h "$DB_HOST" \
    -u "$DB_USER" \
    -p"$DB_PASSWORD" \
    --single-transaction \
    --lock-tables=false \
    --routines \
    --triggers \
    --quick \
    --verbose \
    "$DB_NAME" > "$BACKUP_FILE" 2>&1; then
    log "Backup completed: $BACKUP_FILE"
else
    error_exit "Failed to create database backup"
fi

# Compress backup
if gzip -9 "$BACKUP_FILE"; then
    log "Backup compressed: $COMPRESSED_FILE"
    BACKUP_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
    log "Compressed size: $BACKUP_SIZE"
else
    error_exit "Failed to compress backup"
fi

# Encrypt backup (optional)
if [ -n "$ENCRYPTION_KEY" ]; then
    if openssl enc -aes-256-cbc -salt -in "$COMPRESSED_FILE" -out "$ENCRYPTED_FILE" -pass pass:"$ENCRYPTION_KEY"; then
        log "Backup encrypted: $ENCRYPTED_FILE"
        rm "$COMPRESSED_FILE"
        FINAL_FILE="$ENCRYPTED_FILE"
    else
        error_exit "Failed to encrypt backup"
    fi
else
    FINAL_FILE="$COMPRESSED_FILE"
    log "Backup not encrypted (no encryption key provided)"
fi

# Verify backup integrity
if [ -f "$FINAL_FILE" ] && [ -s "$FINAL_FILE" ]; then
    log "Backup integrity verified: $(stat -f%z "$FINAL_FILE" 2>/dev/null || stat -c%s "$FINAL_FILE") bytes"
else
    error_exit "Backup file is empty or missing"
fi

# Clean up old backups
log "Cleaning up backups older than $BACKUP_RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "lume_backup_*.sql.gz*" -mtime +$BACKUP_RETENTION_DAYS -delete
log "Cleanup completed"

# Generate backup manifest
MANIFEST="${BACKUP_DIR}/backup_manifest_${TIMESTAMP}.txt"
cat > "$MANIFEST" << EOF
Lume Framework Database Backup Manifest
========================================
Date: $(date)
Database: $DB_NAME
Host: $DB_HOST
Backup File: $(basename "$FINAL_FILE")
File Size: $(du -h "$FINAL_FILE" | cut -f1)
MD5 Checksum: $(md5sum "$FINAL_FILE" | awk '{print $1}')
Compressed: yes
Encrypted: $([ -n "$ENCRYPTION_KEY" ] && echo "yes" || echo "no")
Retention Days: $BACKUP_RETENTION_DAYS
EOF

log "Manifest created: $MANIFEST"

# Send notification (optional)
if command -v curl &> /dev/null && [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{
            \"text\": \"Database backup completed\",
            \"blocks\": [
                {
                    \"type\": \"section\",
                    \"text\": {
                        \"type\": \"mrkdwn\",
                        \"text\": \"*Database Backup Completed* ✅\nDatabase: $DB_NAME\nFile: $(basename "$FINAL_FILE")\nSize: $(du -h "$FINAL_FILE" | cut -f1)\"
                    }
                }
            ]
        }" || true
fi

log "Backup process completed successfully"
exit 0
