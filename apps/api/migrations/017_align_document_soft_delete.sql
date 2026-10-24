-- Align Prisma with the existing Drizzle document schema without resetting data.
-- Some installations already have this column; keep those values intact.
SET @document_soft_delete_ddl = IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documents' AND COLUMN_NAME = 'deleted_at'),
  'SELECT 1',
  'ALTER TABLE documents ADD COLUMN deleted_at DATETIME NULL'
);
PREPARE document_soft_delete_stmt FROM @document_soft_delete_ddl;
EXECUTE document_soft_delete_stmt;
DEALLOCATE PREPARE document_soft_delete_stmt;
