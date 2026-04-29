#!/bin/bash
# Cleanup audit script for Lume root documentation files
# This script lists all root .md files and creates an inventory

ROOT_DIR="/opt/Lume"
INVENTORY_FILE="/opt/Lume/docs/superpowers/cleanup_inventory.txt"

echo "=== Lume Root Documentation Audit ===" > "$INVENTORY_FILE"
echo "Generated: $(date)" >> "$INVENTORY_FILE"
echo "" >> "$INVENTORY_FILE"

echo "Total .md files in root:"
find "$ROOT_DIR" -maxdepth 1 -name "*.md" -type f | wc -l >> "$INVENTORY_FILE"
echo "" >> "$INVENTORY_FILE"

echo "=== Files to KEEP in root ===" >> "$INVENTORY_FILE"
echo "- README.md (project readme)" >> "$INVENTORY_FILE"
echo "- CLAUDE.md (project instructions)" >> "$INVENTORY_FILE"
echo "" >> "$INVENTORY_FILE"

echo "=== Architecture & Design Files ===" >> "$INVENTORY_FILE"
find "$ROOT_DIR" -maxdepth 1 -name "*ARCHITECTURE*.md" -o -name "*PHASE_5*.md" -o -name "*NESTJS_MIGRATION_PLAN*.md" | sort >> "$INVENTORY_FILE"
echo "" >> "$INVENTORY_FILE"

echo "=== Security & Hardening ===" >> "$INVENTORY_FILE"
find "$ROOT_DIR" -maxdepth 1 -name "*SECURITY*.md" | sort >> "$INVENTORY_FILE"
echo "" >> "$INVENTORY_FILE"

echo "=== Deployment & Launch ===" >> "$INVENTORY_FILE"
find "$ROOT_DIR" -maxdepth 1 -name "*LAUNCH*.md" -o -name "*ROADMAP*.md" | sort >> "$INVENTORY_FILE"
echo "" >> "$INVENTORY_FILE"

echo "=== Phase Documents (Archive) ===" >> "$INVENTORY_FILE"
find "$ROOT_DIR" -maxdepth 1 -name "PHASE_*.md" | sort >> "$INVENTORY_FILE"
echo "" >> "$INVENTORY_FILE"

echo "=== V2 Documents (Archive) ===" >> "$INVENTORY_FILE"
find "$ROOT_DIR" -maxdepth 1 -name "V2_*.md" | sort >> "$INVENTORY_FILE"
echo "" >> "$INVENTORY_FILE"

echo "=== NestJS Migration Documents ===" >> "$INVENTORY_FILE"
find "$ROOT_DIR" -maxdepth 1 -name "*NESTJS*.md" | sort >> "$INVENTORY_FILE"
echo "" >> "$INVENTORY_FILE"

echo "=== Execution & Status Documents ===" >> "$INVENTORY_FILE"
find "$ROOT_DIR" -maxdepth 1 -name "*EXECUTION*.md" -o -name "*READINESS*.md" -o -name "*STATUS*.md" -o -name "*CHECKLIST*.md" -o -name "*SUMMARY*.md" -o -name "*COMPLETION*.md" | sort >> "$INVENTORY_FILE"
echo "" >> "$INVENTORY_FILE"

echo "=== Other Documents ===" >> "$INVENTORY_FILE"
find "$ROOT_DIR" -maxdepth 1 -name "MIGRATION*.md" -o -name "*JOURNEY*.md" -o -name "*STAKEHOLDER*.md" -o -name "*GUIDE*.md" | sort >> "$INVENTORY_FILE"

echo "Inventory created at: $INVENTORY_FILE"
cat "$INVENTORY_FILE"
