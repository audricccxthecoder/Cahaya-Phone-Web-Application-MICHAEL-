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

    // Buat tabel customers
    console.log('Creating table: customers...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(255),
        address TEXT,
        status VARCHAR(50) DEFAULT 'New',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_phone (phone),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table customers created/verified');

    // Buat tabel admins
    console.log('Creating table: admins...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        full_name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL,
        INDEX idx_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table admins created/verified');

    // Buat tabel messages
    console.log('Creating table: messages...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT,
        message TEXT,
        type VARCHAR(50) DEFAULT 'incoming',
        status VARCHAR(50) DEFAULT 'received',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        INDEX idx_customer (customer_id),
        INDEX idx_created (created_at),
        INDEX idx_type (type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table messages created/verified');

    // Cek apakah ada admin, jika tidak buat default admin
    const [admins] = await connection.query('SELECT COUNT(*) as count FROM admins');
    
    if (admins[0].count === 0) {
      console.log('Creating default admin...');
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await connection.query(
        'INSERT INTO admins (username, password, full_name, email, role) VALUES (?, ?, ?, ?, ?)',
        ['admin', hashedPassword, 'Administrator', 'admin@cahayaphone.com', 'super_admin']
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