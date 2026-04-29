-- Migration: Add AI metadata columns to entities table
-- Date: 2026-04-29
-- Description: Supports AI-native entity descriptions and sensitive field tracking

ALTER TABLE entities ADD COLUMN description TEXT COMMENT 'Human-readable description of the entity for AI context' AFTER display_name;

ALTER TABLE entities ADD COLUMN ai_metadata JSON COMMENT 'AI-specific metadata: {description, sensitiveFields[], summarizeWith}' AFTER description;

-- Create index for querying by module
ALTER TABLE entities ADD INDEX idx_module_name (module_name);

-- Add updated_at timestamp if not exists
ALTER TABLE entities ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;
