-- Migration: Add AI metadata columns to entities table
-- Date: 2026-04-29
-- Description: Supports AI-native entity descriptions and sensitive field tracking

-- The current base schema already has description, updated_at and an index on
-- module_id. Preserve those definitions and existing data; display_name and
-- module_name belong to the obsolete entity layout.
ALTER TABLE entities ADD COLUMN ai_metadata LONGTEXT NULL
  COMMENT 'AI-specific metadata: {description, sensitiveFields[], summarizeWith}';
