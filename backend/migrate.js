const { Client } = require('pg');
require('dotenv').config();

async function migrate() {
  console.log('🚀 Starting database migration (PostgreSQL)...');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Buat tabel admins
    console.log('Creating table: admins...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        nama VARCHAR(100) NOT NULL,
        email VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table admins created/verified');

    // Buat tabel admin_reset_tokens
    console.log('Creating table: admin_reset_tokens...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_reset_tokens (
        id SERIAL PRIMARY KEY,
        admin_id INT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
        token VARCHAR(128) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table admin_reset_tokens created/verified');

    // Buat tabel customers
    console.log('Creating table: customers...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        nama_lengkap VARCHAR(100) NOT NULL,
        nama_sales VARCHAR(100),
        merk_unit VARCHAR(100),
        tipe_unit VARCHAR(100),
        harga NUMERIC(15,2),
        qty INT DEFAULT 1,
        tanggal_lahir DATE,
        alamat TEXT,
        whatsapp VARCHAR(20) NOT NULL,
        metode_pembayaran VARCHAR(50),
        tahu_dari VARCHAR(50),
        source VARCHAR(20) NOT NULL DEFAULT 'Unknown',
        status VARCHAR(20) DEFAULT 'New',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_whatsapp ON customers (whatsapp)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_source ON customers (source)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_status ON customers (status)`);
    console.log('✅ Table customers created/verified');

    // Buat tabel messages
    console.log('Creating table: messages...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        direction VARCHAR(3) CHECK (direction IN ('in', 'out')) NOT NULL,
        message TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_msg_customer ON messages (customer_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_msg_direction ON messages (direction)`);
    console.log('✅ Table messages created/verified');

    // Buat view statistik
    console.log('Creating view: customer_stats...');
    await client.query(`
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
        SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 ELSE 0 END) as today_customers,
        SUM(CASE WHEN source NOT IN ('Website','Instagram','Facebook','TikTok','Teman/Keluarga') THEN 1 ELSE 0 END) as from_others
      FROM customers
    `);
    console.log('✅ View customer_stats created/verified');

    // Buat default admin jika belum ada
    const { rows: adminRows } = await client.query('SELECT COUNT(*) as count FROM admins');
    if (parseInt(adminRows[0].count) === 0) {
      console.log('Creating default admin...');
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);

      await client.query(
        'INSERT INTO admins (username, password, nama, email) VALUES ($1, $2, $3, $4)',
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
    const { rows: cc } = await client.query('SELECT COUNT(*) as count FROM customers');
    const { rows: ac } = await client.query('SELECT COUNT(*) as count FROM admins');
    const { rows: mc } = await client.query('SELECT COUNT(*) as count FROM messages');

    console.log('\n📊 Database Summary:');
    console.log(`   Customers: ${cc[0].count}`);
    console.log(`   Admins: ${ac[0].count}`);
    console.log(`   Messages: ${mc[0].count}`);
    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

migrate()
  .then(() => {
    console.log('✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
