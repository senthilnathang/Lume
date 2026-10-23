-- Apply before deploying the Prisma client that includes cascadeUpdate.
-- Updates remain disabled for existing relationships.
ALTER TABLE entity_relationships
  ADD COLUMN cascade_update BOOLEAN NOT NULL DEFAULT FALSE;
