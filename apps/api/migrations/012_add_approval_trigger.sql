-- Existing approval chains stay manual until explicitly configured.
ALTER TABLE automation_approval_chains
  ADD COLUMN trigger_event VARCHAR(30) NOT NULL DEFAULT 'manual';
