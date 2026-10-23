-- Marketplace models are managed by Drizzle and are not created by Prisma.
CREATE TABLE IF NOT EXISTS marketplace_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(255),
  description TEXT,
  plugin_count INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS marketplace_plugins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(150) NOT NULL,
  version VARCHAR(20) NOT NULL,
  author VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(255),
  category VARCHAR(50) NOT NULL,
  tags JSON DEFAULT ('[]'),
  screenshots JSON DEFAULT ('[]'),
  pricing VARCHAR(20) DEFAULT 'free',
  download_count INT DEFAULT 0,
  rating VARCHAR(4) DEFAULT '0.00',
  review_count INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  published_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS marketplace_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  plugin_name VARCHAR(100) NOT NULL,
  user_id INT NOT NULL,
  rating INT NOT NULL,
  title VARCHAR(255),
  body TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS marketplace_downloads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  plugin_name VARCHAR(100) NOT NULL,
  user_id INT NOT NULL,
  installed_version VARCHAR(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS marketplace_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(150) NOT NULL,
  manifest_url VARCHAR(500) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  submitted_by INT NOT NULL,
  approved_by INT,
  rejection_reason TEXT,
  download_count INT DEFAULT 0,
  install_count INT DEFAULT 0,
  review_count INT DEFAULT 0,
  rating VARCHAR(4) DEFAULT '0.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
