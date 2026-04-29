-- Migration: Create plugin management tables
-- Date: 2026-04-29
-- Description: Stores plugin manifests, installations, and execution logs

CREATE TABLE IF NOT EXISTS plugins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(150),
  version VARCHAR(20) NOT NULL,
  author VARCHAR(100),
  description TEXT,
  compatibility VARCHAR(20) COMMENT 'Semver range: >=2.0.0',
  manifest_json JSON NOT NULL COMMENT 'Full plugin manifest',
  entrypoint VARCHAR(255) COMMENT 'Path to plugin entry point',
  db_prefix VARCHAR(50) COMMENT 'Database table prefix for plugin',
  is_enabled TINYINT(1) DEFAULT 1,
  is_installed TINYINT(1) DEFAULT 1,
  dependencies JSON COMMENT 'Plugin dependencies: {pluginName: version}',
  permissions JSON COMMENT 'Plugin permissions array',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  installed_by INT,
  installed_at TIMESTAMP NULL,
  UNIQUE KEY unique_plugin_name (name),
  INDEX idx_enabled (is_enabled),
  INDEX idx_installed (is_installed),
  FOREIGN KEY (installed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Plugin execution logs for tracking plugin operations
CREATE TABLE IF NOT EXISTS plugin_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  plugin_name VARCHAR(100) NOT NULL,
  operation VARCHAR(50) COMMENT 'install, enable, disable, uninstall, execute',
  status ENUM('success', 'failed', 'warning') DEFAULT 'success',
  message TEXT,
  stack_trace TEXT,
  executed_by INT,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration_ms INT,
  INDEX idx_plugin_operation (plugin_name, operation),
  INDEX idx_status (status),
  INDEX idx_executed (executed_at),
  FOREIGN KEY (executed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
