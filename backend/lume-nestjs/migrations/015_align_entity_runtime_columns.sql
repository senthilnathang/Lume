-- Runtime fields already declared by Prisma but missing in the legacy app DB.
ALTER TABLE entities
  ADD COLUMN is_publishable BOOLEAN NULL DEFAULT FALSE,
  ADD COLUMN is_published BOOLEAN NULL DEFAULT FALSE,
  ADD COLUMN published_at DATETIME NULL;
ALTER TABLE entity_fields
  ADD COLUMN is_stored BOOLEAN NULL DEFAULT FALSE,
  ADD COLUMN formula_type VARCHAR(20) NULL;
