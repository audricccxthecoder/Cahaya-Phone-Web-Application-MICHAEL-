// ============================================
// DATABASE CONFIGURATION
// ============================================

const mysql = require('mysql2/promise');
require('dotenv').config();

// Parse DATABASE_URL if provided (Railway), otherwise use individual env vars
let poolConfig;

console.log('[DB Config] Checking environment variables...');
console.log('[DB Config] MYSQL_URL available:', !!process.env.MYSQL_URL);
console.log('[DB Config] DATABASE_URL available:', !!process.env.DATABASE_URL);
console.log('[DB Config] Environment:', process.env.NODE_ENV);

if (process.env.MYSQL_URL) {
    // Railway MySQL connection string format (preferred)
    console.log('[DB Config] Using MYSQL_URL from Railway');
    const url = new URL(process.env.MYSQL_URL);
    poolConfig = {
        host: url.hostname,
        port: url.port || 3306,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1), // Remove leading slash
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 30000,
        enableKeepAlive: true
    };
    console.log('[DB Config] Connected to database:', poolConfig.database, 'at', poolConfig.host);
} else if (process.env.DATABASE_URL) {
    // Alternative DATABASE_URL format
    console.log('[DB Config] Using DATABASE_URL');
    const url = new URL(process.env.DATABASE_URL);
    poolConfig = {
        host: url.hostname,
        port: url.port || 3306,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 30000,
        enableKeepAlive: true
    };
    console.log('[DB Config] Connected to database:', poolConfig.database, 'at', poolConfig.host);
} else {
    // Local development config or Railway with individual vars
    console.log('[DB Config] Using individual environment variables');
    poolConfig = {
        host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT || 3306),
        user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
        password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 30000,
        enableKeepAlive: true
    };
    console.log('[DB Config] Connected to database:', poolConfig.database, 'at', poolConfig.host);
}

// Create connection pool
const pool = mysql.createPool(poolConfig);

// Test connection
pool.getConnection()
    .then(connection => {
        console.log('✅ Database connected successfully');
        console.log('[DB Config] Connection pool established');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
        console.error('[DB Config] Error details:', err.code, err.errno);
        process.exit(1);
    });

module.exports = pool;