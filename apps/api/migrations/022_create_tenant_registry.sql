-- Registry IDs are existing numeric company IDs. No inferred ownership or backfill.
-- Archived entries retain IDs/domains and never cascade into company data.
CREATE TABLE IF NOT EXISTS tenant_registry (
  id INT NOT NULL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  domain VARCHAR(253) NOT NULL,
  config LONGTEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  UNIQUE KEY tenant_registry_domain_key (domain)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
