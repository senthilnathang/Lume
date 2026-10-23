ALTER TABLE automation_approval_chains
  ADD COLUMN on_completed VARCHAR(100) NULL,
  ADD COLUMN on_rejected VARCHAR(100) NULL;
ALTER TABLE automation_approval_requests
  ADD COLUMN workflow_data VARCHAR(500) NOT NULL DEFAULT '{}';
CREATE TABLE automation_jobs (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  event_key VARCHAR(191) NOT NULL UNIQUE,
  kind VARCHAR(40) NOT NULL,
  company_id INT NOT NULL,
  user_id INT NOT NULL,
  payload LONGTEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  available_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  lease_until DATETIME(3) NULL,
  lease_token VARCHAR(36) NULL,
  last_error TEXT NULL,
  result LONGTEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX automation_job_ready(status,available_at),
  INDEX automation_job_tenant(company_id,kind)
) ENGINE=InnoDB;
CREATE TABLE automation_receipts (
  `key` VARCHAR(191) NOT NULL PRIMARY KEY,
  result LONGTEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;
