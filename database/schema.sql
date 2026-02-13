-- Gawdesy NGO Website Database Schema
-- MySQL Database

-- Use gawdesy database
USE gawdesy;

-- Users Table (for Admin) - Create FIRST to avoid FK issues
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    avatar VARCHAR(255),
    role ENUM('admin', 'manager', 'editor', 'viewer') DEFAULT 'viewer',
    is_active BOOLEAN DEFAULT TRUE,
    last_login DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100),
    founded_date DATE,
    vision TEXT,
    mission TEXT,
    objectives TEXT,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(100),
    website VARCHAR(255),
    logo VARCHAR(255),
    facebook_url VARCHAR(255),
    twitter_url VARCHAR(255),
    instagram_url VARCHAR(255),
    linkedin_url VARCHAR(255),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Team Members Table
CREATE TABLE IF NOT EXISTS team_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    organization_id INT,
    name VARCHAR(255) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    qualifications VARCHAR(255),
    photo VARCHAR(255),
    message TEXT,
    phone VARCHAR(50),
    email VARCHAR(100),
    sort_order INT DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_sort_order (sort_order),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Programmes Table
CREATE TABLE IF NOT EXISTS programmes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(100),
    color VARCHAR(20) DEFAULT '#2E7D32',
    objectives TEXT,
    target_beneficiaries VARCHAR(255),
    outcomes TEXT,
    sort_order INT DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_status (status),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Activities Table
CREATE TABLE IF NOT EXISTS activities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    programme_id INT,
    activity_date DATE,
    location VARCHAR(255),
    beneficiaries_count INT DEFAULT 0,
    images JSON,
    videos JSON,
    status ENUM('published', 'draft') DEFAULT 'draft',
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_programme_id (programme_id),
    INDEX idx_status (status),
    INDEX idx_activity_date (activity_date),
    INDEX idx_featured (featured),
    FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    type ENUM('brochure', 'annual_report', 'policy', 'other') DEFAULT 'other',
    file_path VARCHAR(255),
    file_size INT,
    file_type VARCHAR(50),
    year INT,
    description TEXT,
    download_count INT DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_year (year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Donors Table
CREATE TABLE IF NOT EXISTS donors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(50),
    address TEXT,
    pan_number VARCHAR(20),
    type ENUM('individual', 'organization', 'government', 'corporate') DEFAULT 'individual',
    anonymous_donation BOOLEAN DEFAULT FALSE,
    total_donations DECIMAL(15, 2) DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Donations Table
CREATE TABLE IF NOT EXISTS donations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    donor_id INT,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    payment_method ENUM('cash', 'cheque', 'bank_transfer', 'online', 'other'),
    transaction_id VARCHAR(100),
    bank_name VARCHAR(100),
    cheque_number VARCHAR(50),
    receipt_number VARCHAR(50),
    programme_id INT,
    designation VARCHAR(255),
    notes TEXT,
    receipt_sent BOOLEAN DEFAULT FALSE,
    receipt_sent_at DATETIME,
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    donated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_donor_id (donor_id),
    INDEX idx_status (status),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_receipt_number (receipt_number),
    INDEX idx_donated_at (donated_at),
    FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE SET NULL,
    FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Contact Messages Table
CREATE TABLE IF NOT EXISTS contact_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    reply TEXT,
    replied_by INT,
    replied_at DATETIME,
    status ENUM('new', 'read', 'replied', 'archived') DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (replied_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert Default Admin User (Password: admin123)
INSERT INTO users (username, email, password, first_name, last_name, role, is_active)
VALUES ('admin', 'admin@gawdesy.org', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.dW8KIuJ3eHFf6i', 'Admin', 'User', 'admin', TRUE);

-- Insert Sample Organization Data
INSERT INTO organizations (name, registration_number, founded_date, vision, mission, address, phone, email)
VALUES (
    'Gandhian Welfare and Development Society',
    'TN/1997/01234',
    '1997-01-15',
    'A society attained with holistic development of Education, Health and Socio-Economic well-being resulting in standard quality of life.',
    'To create awareness, build capacity, and empower underprivileged communities through vocational training, health programs, and socio-economic initiatives.',
    'Main Road, Karuppur, Konerirajapuram Po, Thiruvaiyaru Tk, Thanjavur, Tamil Nadu - 613101',
    '+91 43622 83720',
    'gawdesy@gmail.com'
);

-- Insert Sample Team Members
INSERT INTO team_members (name, designation, message, sort_order, status)
VALUES 
('Mr. A. Mavadiyan', 'President', 'Dedicated to serving the community and empowering the underprivileged.', 1, 'active'),
('Mr. K. Karunamoorthy', 'Secretary', 'Committed to creating positive change through sustainable development.', 2, 'active');

-- Insert Sample Programmes
INSERT INTO programmes (title, slug, description, icon, color, objectives, target_beneficiaries, status)
VALUES 
('Health & Sanitation', 'health-sanitation', 'Improving community health through awareness programs, sanitation facilities, and healthcare access.', '🏥', '#2E7D32', 'To improve overall health and sanitation conditions in rural communities.', 'Rural communities, 5000+ families', 'active'),
('Self Help Groups', 'self-help-groups', 'Empowering women through Self Help Groups for socio-economic development.', '👥', '#1890FF', 'To promote women empowerment through collective action and financial inclusion.', 'Women in rural areas, 600+ groups', 'active'),
('TB Control', 'tb-control', 'Tuberculosis awareness, detection, and treatment support programs.', '🩺', '#EB2F96', 'To eliminate TB through awareness, early detection, and complete treatment support.', 'TB patients and suspects, 100+ villages', 'active'),
('Farmers Clubs', 'farmers-clubs', 'Supporting farmers through organic farming education and collective marketing.', '🌾', '#52C41A', 'To empower farmers with modern agricultural practices and market access.', 'Farmers, 98 clubs', 'active'),
('Vocational Training', 'vocational-training', 'Skill development and vocational training for youth and women.', '🎓', '#FAAD14', 'To provide employable skills to youth and women for sustainable livelihood.', 'Youth and women, 500+ trainees', 'active');

-- Insert Sample Activities
INSERT INTO activities (title, description, programme_id, activity_date, location, beneficiaries_count, status, featured)
VALUES 
('SHG Coordination Meeting', 'Quarterly coordination meeting with 600 women SHG members to review progress and share best practices.', 2, '2024-10-15', 'GAWDESY Office', 600, 'published', TRUE),
('TB Awareness Programme', 'Health education and TB awareness programme in 56 villages.', 3, '2024-09-20', 'Multiple Villages', 5000, 'published', TRUE),
('Farmers Club Inauguration', 'New farmers club formation and inauguration with NABARD support.', 4, '2024-08-10', 'Thiruvaiyaru', 150, 'published', FALSE);

-- Insert Sample Documents
INSERT INTO documents (title, type, year, description, status)
VALUES 
('Annual Report 2023-2024', 'annual_report', 2024, 'Annual report for the financial year 2023-2024', 'active'),
('Organization Brochure', 'brochure', 2024, 'General information about GAWDESY and its programmes', 'active'),
('Privacy Policy', 'policy', 2023, 'Organization privacy policy', 'active');

SELECT 'Database schema created successfully!' AS status;
