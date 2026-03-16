// ============================================
// DATABASE CONFIGURATION - PostgreSQL (Supabase)
// ============================================

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // required for Supabase & most cloud PostgreSQL
});

module.exports = pool;
