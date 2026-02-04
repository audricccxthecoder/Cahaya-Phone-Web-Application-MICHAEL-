-- ============================================
-- DATABASE SCHEMA - CAHAYA PHONE CRM
-- ============================================

CREATE DATABASE IF NOT EXISTS cahaya_phone_crm;
USE cahaya_phone_crm;

-- ============================================
-- TABEL ADMIN
-- ============================================
CREATE TABLE IF NOT EXISTS admins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nama VARCHAR(100) NOT NULL,
    email VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin
-- Username: admin
-- Password: admin123
INSERT INTO admins (username, password, nama, email) VALUES 
('admin', '$2a$10$i4H32RnI3kzLIDrZSYYEVOMRKzUcAydkLpAm4X.2KvT5aZL.qeU9u', 'Administrator', 'admin@localhost');

-- Table to store admin reset tokens
CREATE TABLE IF NOT EXISTS admin_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    token VARCHAR(128) NOT NULL,
    expires_at DATETIME NOT NULL,
    used TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

-- ============================================
-- TABEL CUSTOMERS
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nama_lengkap VARCHAR(100) NOT NULL,
    nama_sales VARCHAR(100),
    merk_unit VARCHAR(100),
    tipe_unit VARCHAR(100),
    harga DECIMAL(15,2),
    qty INT DEFAULT 1,
    tanggal_lahir DATE,
    alamat TEXT,
    whatsapp VARCHAR(20) NOT NULL,
    metode_pembayaran VARCHAR(50),
    tahu_dari VARCHAR(50),
    source VARCHAR(20) NOT NULL DEFAULT 'Unknown',
    status VARCHAR(20) DEFAULT 'New',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_whatsapp (whatsapp),
    INDEX idx_source (source),
    INDEX idx_status (status)
);

-- ============================================
-- TABEL MESSAGES (LOG CHAT WHATSAPP)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    direction ENUM('in', 'out') NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_customer (customer_id),
    INDEX idx_direction (direction)
);

-- ============================================
-- DATA CONTOH (OPTIONAL - UNTUK TESTING)
-- ============================================

-- Contoh customer dari Website
INSERT INTO customers (
    nama_lengkap, nama_sales, merk_unit, tipe_unit, harga, qty, 
    tanggal_lahir, alamat, whatsapp, metode_pembayaran, tahu_dari, source, status
) VALUES 
(
    'Budi Santoso', 'Sales A', 'iPhone', '15 Pro Max', 18000000, 1,
    '1990-05-15', 'Jl. Sudirman No. 123, Jakarta', '081234567890',
    'Cash', 'Website', 'Website', 'New'
);

-- Contoh customer dari Instagram
INSERT INTO customers (
    nama_lengkap, whatsapp, source, status
) VALUES 
(
    'Siti Nurhaliza', '081298765432', 'Instagram', 'New'
);

-- Contoh messages
INSERT INTO messages (customer_id, direction, message) VALUES
(1, 'out', 'Halo Budi Santoso, terima kasih sudah menghubungi Cahaya Phone. Tim sales Sales A akan segera menghubungi Anda.'),
(2, 'in', 'Halo saya dari Instagram'),
(2, 'out', 'Halo Siti Nurhaliza, terima kasih sudah menghubungi Cahaya Phone. Tim kami akan segera menghubungi Anda.');

-- ============================================
-- VIEW UNTUK STATISTIK
-- ============================================
CREATE OR REPLACE VIEW customer_stats AS
SELECT 
    COUNT(*) as total_customers,
    SUM(CASE WHEN source = 'Website' THEN 1 ELSE 0 END) as from_website,
    SUM(CASE WHEN source = 'Instagram' THEN 1 ELSE 0 END) as from_instagram,
    SUM(CASE WHEN source = 'Facebook' THEN 1 ELSE 0 END) as from_facebook,
    SUM(CASE WHEN source = 'TikTok' THEN 1 ELSE 0 END) as from_tiktok,
    SUM(CASE WHEN source LIKE '%Teman%' OR source LIKE '%Keluarga%' THEN 1 ELSE 0 END) as from_friends,
    SUM(CASE WHEN status = 'New' THEN 1 ELSE 0 END) as new_customers,
    SUM(CASE WHEN status = 'Old' THEN 1 ELSE 0 END) as old_customers,
    SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_customers,
    -- Exclude known sources AND Teman/Keluarga so 'Lainnya' only counts truly other values
    SUM(CASE WHEN source NOT IN ('Website','Instagram','Facebook','TikTok','Teman/Keluarga') THEN 1 ELSE 0 END) as from_others
FROM customers;