-- Legacy notifications remain global to their owner (company_id NULL).
-- Approval notifications always carry a tenant and a stable lifecycle event key.
ALTER TABLE notifications
  ADD COLUMN company_id INT NULL,
  ADD COLUMN event_key VARCHAR(150) NULL,
  ADD UNIQUE INDEX notification_event_recipient (user_id, event_key),
  ADD INDEX notification_inbox_scope (user_id, company_id, status);
