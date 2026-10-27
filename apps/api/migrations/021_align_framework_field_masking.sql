-- Core field-access metadata exists in Prisma but may be absent from legacy DBs.
-- Add only missing columns; preserve existing permissions and masking values.
SET @lume_mask_column = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'entity_field_permissions'
    AND COLUMN_NAME = 'is_masked'
);
SET @lume_mask_sql = IF(@lume_mask_column = 0,
  'ALTER TABLE entity_field_permissions ADD COLUMN is_masked BOOLEAN NULL DEFAULT FALSE',
  'SELECT 1');
PREPARE lume_mask_stmt FROM @lume_mask_sql;
EXECUTE lume_mask_stmt;
DEALLOCATE PREPARE lume_mask_stmt;

SET @lume_mask_column = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'entity_field_permissions'
    AND COLUMN_NAME = 'mask_char'
);
SET @lume_mask_sql = IF(@lume_mask_column = 0,
  'ALTER TABLE entity_field_permissions ADD COLUMN mask_char VARCHAR(5) NULL DEFAULT ''*''',
  'SELECT 1');
PREPARE lume_mask_stmt FROM @lume_mask_sql;
EXECUTE lume_mask_stmt;
DEALLOCATE PREPARE lume_mask_stmt;
