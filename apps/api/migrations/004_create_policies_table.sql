-- Migration: Create policies table for ABAC+RBAC policy definitions
-- Date: 2026-04-29
-- Description: Stores attribute-based and role-based access control policies

CREATE TABLE IF NOT EXISTS policies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  entity VARCHAR(100) NOT NULL,
  description TEXT,
  actions JSON NOT NULL COMMENT 'Array of allowed actions: read, write, delete, create, *',
  conditions JSON COMMENT 'ABAC conditions array: [{field, operator, value}]',
  roles JSON COMMENT 'RBAC roles array: [role1, role2, ...]',
  deny TINYINT(1) DEFAULT 0 COMMENT '1 = deny policy, 0 = allow policy',
  module_name VARCHAR(100),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,
  updated_by INT,
  UNIQUE KEY unique_policy_name (name),
  INDEX idx_entity (entity),
  INDEX idx_deny (deny),
  INDEX idx_active (is_active),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
