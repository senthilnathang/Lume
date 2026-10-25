-- Manual state-machine executions are separate from durable metadata jobs and
-- legacy execution tables. Existing definitions, records and history are preserved.
CREATE TABLE IF NOT EXISTS workflow_state_executions (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  workflow_id INT NOT NULL,
  record_entity_id INT NOT NULL,
  record_id INT NOT NULL,
  company_id INT NOT NULL,
  initiated_by INT NOT NULL,
  definition LONGTEXT NOT NULL,
  current_state VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  version INT NOT NULL DEFAULT 0,
  started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  completed_at DATETIME(3) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX workflow_state_executions_company_id_workflow_id_record_id_idx (company_id, workflow_id, record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS workflow_state_history (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  execution_id INT NOT NULL,
  version INT NOT NULL,
  from_state VARCHAR(50) NULL,
  to_state VARCHAR(50) NOT NULL,
  transition_code VARCHAR(100) NOT NULL,
  transition_name VARCHAR(255) NOT NULL,
  user_id INT NOT NULL,
  transitioned_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY workflow_state_history_execution_id_version_key (execution_id, version),
  CONSTRAINT workflow_state_history_execution_id_fkey FOREIGN KEY (execution_id)
    REFERENCES workflow_state_executions(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
