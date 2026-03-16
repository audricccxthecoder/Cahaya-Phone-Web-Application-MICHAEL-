// ============================================
// DATABASE CONFIGURATION - PostgreSQL (Supabase)
// ============================================

const { Pool } = require('pg');
require('dotenv').config();

console.log('[DB Config] Connecting to PostgreSQL...');
console.log('[DB Config] DATABASE_URL available:', !!process.env.DATABASE_URL);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection
pool.connect()
    .then(client => {
        console.log('✅ Database connected successfully');
        client.release();
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
    });

module.exports = pool;
