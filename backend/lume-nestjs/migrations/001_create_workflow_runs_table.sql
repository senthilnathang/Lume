-- Migration: Create workflow_runs table for tracking workflow executions
-- Date: 2026-04-29
-- Description: Stores execution history of workflows with status, logs, and error tracking

CREATE TABLE IF NOT EXISTS workflow_runs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workflow_name VARCHAR(100) NOT NULL,
  workflow_version VARCHAR(20),
  entity_name VARCHAR(100),
  record_id INT,
  trigger_type VARCHAR(50),
  trigger_data JSON,
  status ENUM('running', 'completed', 'failed', 'timeout', 'cancelled') DEFAULT 'running',
  steps_log JSON COMMENT 'Array of executed steps with results',
  error_message TEXT,
  error_stack TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  duration_ms INT,
  triggered_by INT,
  triggered_by_type ENUM('user', 'workflow', 'api', 'schedule') DEFAULT 'user',
  INDEX idx_workflow_record (workflow_name, record_id),
  INDEX idx_status (status),
  INDEX idx_created (started_at),
  FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
