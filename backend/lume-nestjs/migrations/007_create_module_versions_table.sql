-- Migration: Create module_versions table for tracking installed module versions
-- Date: 2026-04-29
-- Description: Records module installation and upgrade history

CREATE TABLE IF NOT EXISTS module_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  module_name VARCHAR(100) NOT NULL,
  version VARCHAR(20) NOT NULL,
  manifest_snapshot JSON NOT NULL COMMENT 'Module manifest at install time',
  entities JSON COMMENT 'Entity definitions snapshot',
  workflows JSON COMMENT 'Workflow definitions snapshot',
  permissions JSON COMMENT 'Permission definitions snapshot',
  install_notes TEXT,
  installed_by INT,
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_module_version (module_name, version),
  INDEX idx_module (module_name),
  INDEX idx_installed (installed_at),
  FOREIGN KEY (installed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
