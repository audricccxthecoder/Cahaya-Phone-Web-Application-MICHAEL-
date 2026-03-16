const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  console.log('🚀 Starting database migration...');
  
  let connection;
  
  try {
    // Koneksi ke database menggunakan MYSQL_URL dari Railway
    connection = await mysql.createConnection(process.env.MYSQL_URL || {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Connected to database');

    // Buat tabel admins
    console.log('Creating table: admins...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        nama VARCHAR(100) NOT NULL,
        email VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table admins created/verified');

    // Buat tabel admin_reset_tokens
    console.log('Creating table: admin_reset_tokens...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_reset_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        token VARCHAR(128) NOT NULL,
        expires_at DATETIME NOT NULL,
        used TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table admin_reset_tokens created/verified');

    // Buat tabel customers
    console.log('Creating table: customers...');
    await connection.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table customers created/verified');

    // Buat tabel messages
    console.log('Creating table: messages...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customer_id INT NOT NULL,
        direction ENUM('in', 'out') NOT NULL,
        message TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        INDEX idx_customer (customer_id),
        INDEX idx_direction (direction)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table messages created/verified');

    // Buat view statistik
    console.log('Creating view: customer_stats...');
    await connection.query(`
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
        SUM(CASE WHEN source NOT IN ('Website','Instagram','Facebook','TikTok','Teman/Keluarga') THEN 1 ELSE 0 END) as from_others
      FROM customers
    `);
    console.log('✅ View customer_stats created/verified');

    // Cek apakah ada admin, jika tidak buat default admin
    const [admins] = await connection.query('SELECT COUNT(*) as count FROM admins');

    if (admins[0].count === 0) {
      console.log('Creating default admin...');
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);

      await connection.query(
        'INSERT INTO admins (username, password, nama, email) VALUES (?, ?, ?, ?)',
        ['admin', hashedPassword, 'Administrator', 'admin@localhost']
      );
      console.log('✅ Default admin created');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   ⚠️  PLEASE CHANGE THIS PASSWORD AFTER FIRST LOGIN!');
    } else {
      console.log('ℹ️  Admin already exists, skipping creation');
    }

    // Tampilkan ringkasan
    const [customerCount] = await connection.query('SELECT COUNT(*) as count FROM customers');
    const [adminCount] = await connection.query('SELECT COUNT(*) as count FROM admins');
    const [messageCount] = await connection.query('SELECT COUNT(*) as count FROM messages');

    console.log('\n📊 Database Summary:');
    console.log(`   Customers: ${customerCount[0].count}`);
    console.log(`   Admins: ${adminCount[0].count}`);
    console.log(`   Messages: ${messageCount[0].count}`);

    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Jalankan migration
migrate()
  .then(() => {
    console.log('✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });