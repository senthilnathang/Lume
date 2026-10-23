-- Apply before using the approval request lifecycle. Definitions remain in
-- automation_approval_chains; historical requests retain their step snapshots.
CREATE TABLE automation_approval_requests (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  chain_id INT NOT NULL,
  record_entity_id INT NOT NULL,
  record_id INT NOT NULL,
  company_id INT NOT NULL,
  current_step INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  steps_data LONGTEXT NOT NULL,
  initiated_by INT NOT NULL,
  completed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX approval_request_lookup (company_id, chain_id, record_entity_id, record_id, status)
) ENGINE=InnoDB;
