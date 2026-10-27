-- Canonical actor/tenant-bound schedules. Legacy unscoped definitions remain
-- untouched for explicit import; never infer an execution actor from old code.
CREATE TABLE IF NOT EXISTS automation_workflow_schedules (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  workflow_name VARCHAR(100) NOT NULL,
  entity_id INT NOT NULL,
  record_id INT NOT NULL,
  company_id INT NOT NULL,
  user_id INT NOT NULL,
  cron_expression VARCHAR(100) NULL,
  interval_minutes INT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'inactive',
  version INT NOT NULL DEFAULT 0,
  next_run_at DATETIME(3) NULL,
  last_queued_at DATETIME(3) NULL,
  last_job_id INT NULL,
  last_error VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX automation_workflow_schedules_company_id_user_id_idx (company_id, user_id),
  INDEX automation_workflow_schedules_status_next_run_at_idx (status, next_run_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
