-- Approval requests remain owned by the approval engine. Bind each request to
-- one execution visit and transition; rejected attempts remain auditable.
CREATE TABLE IF NOT EXISTS workflow_state_approvals (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  execution_id INT NOT NULL,
  version INT NOT NULL,
  transition_code VARCHAR(100) NOT NULL,
  request_id INT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY workflow_state_approvals_request_id_key (request_id),
  INDEX workflow_state_approval_lookup (execution_id, version, transition_code),
  CONSTRAINT workflow_state_approvals_execution_id_fkey FOREIGN KEY (execution_id)
    REFERENCES workflow_state_executions(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @workflow_state_approval_ddl = IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'workflow_state_history' AND COLUMN_NAME = 'approval_request_id'),
  'SELECT 1',
  'ALTER TABLE workflow_state_history ADD COLUMN approval_request_id INT NULL'
);
PREPARE workflow_state_approval_stmt FROM @workflow_state_approval_ddl;
EXECUTE workflow_state_approval_stmt;
DEALLOCATE PREPARE workflow_state_approval_stmt;
