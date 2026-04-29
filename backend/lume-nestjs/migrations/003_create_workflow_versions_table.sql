-- Migration: Create workflow_versions table for workflow definition versioning
-- Date: 2026-04-29
-- Description: Tracks changes to workflow definitions with snapshots

CREATE TABLE IF NOT EXISTS workflow_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workflow_name VARCHAR(100) NOT NULL,
  version_number VARCHAR(20) NOT NULL,
  definition JSON NOT NULL COMMENT 'Complete workflow definition at this version',
  triggers JSON COMMENT 'Trigger configurations',
  steps JSON COMMENT 'Step definitions',
  hooks JSON COMMENT 'Lifecycle hooks',
  change_note VARCHAR(255),
  changed_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_workflow_version (workflow_name, version_number),
  INDEX idx_workflow (workflow_name),
  INDEX idx_created (created_at),
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
