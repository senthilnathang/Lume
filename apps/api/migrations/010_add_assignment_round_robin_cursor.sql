-- Apply before deploying the assignment engine / regenerated Prisma client.
-- -1 makes the first assignment select the first active user in stable ID order.
ALTER TABLE automation_assignment_rules
  ADD COLUMN last_assigned_index INT NOT NULL DEFAULT -1;
