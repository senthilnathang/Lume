-- Desired configuration only. Applied revisions are local to each API process.
CREATE TABLE IF NOT EXISTS runtime_module_configs (
  module_name VARCHAR(100) NOT NULL PRIMARY KEY,
  config LONGTEXT NOT NULL,
  revision INT NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
