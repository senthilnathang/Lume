-- Migration: Add field indexing support for query optimization
-- Date: 2026-04-29
-- Description: Enables marking fields as indexed for QueryBuilder filtering

ALTER TABLE entity_fields ADD COLUMN is_indexed TINYINT(1) DEFAULT 0 COMMENT '1 = field should be indexed for queries' AFTER is_primary_key;

-- Create the entity_record_search_index table for indexed field values
CREATE TABLE IF NOT EXISTS entity_record_search_index (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  entity_name VARCHAR(100) NOT NULL,
  record_id INT NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  field_value VARCHAR(500),
  field_value_lower VARCHAR(500) COMMENT 'Lowercase for case-insensitive search',
  value_numeric DECIMAL(19, 4) COMMENT 'Numeric values for range queries',
  value_date DATE COMMENT 'Date values for date range queries',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_index (entity_name, record_id, field_name),
  INDEX idx_entity_field (entity_name, field_name),
  INDEX idx_value (field_value(100)),
  INDEX idx_value_lower (field_value_lower(100)),
  INDEX idx_numeric (value_numeric),
  INDEX idx_date (value_date),
  FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add index to entity_fields for faster lookups
ALTER TABLE entity_fields ADD INDEX idx_entity_field (entity_id, field_name);
