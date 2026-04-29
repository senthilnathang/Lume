-- Migration: Create record_versions table for full record versioning with diffs
-- Date: 2026-04-29
-- Description: Stores complete version history of records with field-level change tracking

CREATE TABLE IF NOT EXISTS record_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entity_name VARCHAR(100) NOT NULL,
  record_id INT NOT NULL,
  version_number INT NOT NULL,
  data_snapshot JSON NOT NULL COMMENT 'Full record state at this version',
  changed_fields JSON COMMENT 'Array of field names that changed',
  field_diff JSON COMMENT 'Field-level diff: {fieldName: {from, to}}',
  change_type ENUM('create', 'update', 'delete', 'restore') DEFAULT 'update',
  change_source ENUM('user', 'workflow', 'api', 'import') DEFAULT 'user',
  change_note VARCHAR(255),
  changed_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_version (entity_name, record_id, version_number),
  INDEX idx_record (entity_name, record_id),
  INDEX idx_version (entity_name, record_id, version_number),
  INDEX idx_created (created_at),
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create trigger to auto-increment version_number
DROP TRIGGER IF EXISTS auto_version_number;
DELIMITER $$
CREATE TRIGGER auto_version_number
BEFORE INSERT ON record_versions
FOR EACH ROW
BEGIN
  IF NEW.version_number IS NULL THEN
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO NEW.version_number
    FROM record_versions
    WHERE entity_name = NEW.entity_name
      AND record_id = NEW.record_id;
  END IF;
END$$
DELIMITER ;
