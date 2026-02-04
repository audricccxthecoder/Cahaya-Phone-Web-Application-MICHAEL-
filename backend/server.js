// // ============================================
// // CAHAYA PHONE CRM - MAIN SERVER
// // ============================================

// const express = require('express');
// const cors = require('cors');
// const bodyParser = require('body-parser');
// const path = require('path');
// require('dotenv').config();

// // Import routes
// const apiRoutes = require('./routes/api');

// // Initialize app
// const app = express();
// const PORT = process.env.PORT || 5000;

// // ============================================
// // MIDDLEWARE
// // ============================================

// // CORS
// app.use(cors({
//     origin: process.env.ALLOWED_ORIGINS.split(','),
//     credentials: true
// }));

// // Body parser
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));

// // Serve frontend static files
// app.use(express.static(path.join(__dirname, '..', 'customer')));

// // Request logger
// app.use((req, res, next) => {
//     console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
//     next();
// });

// // ============================================
// // ROUTES
// // ============================================

// // Health check
// app.get('/api', (req, res) => {
//     res.json({
//         success: true,
//         message: 'Cahaya Phone CRM API is running',
//         version: '1.0.0',
//         timestamp: new Date().toISOString()
//     });
// });

// // API routes
// app.use('/api', apiRoutes);

// // 404 handler
// app.use((req, res) => {
//     res.status(404).json({
//         success: false,
//         message: 'Endpoint not found'
//     });
// });

// // Error handler
// app.use((err, req, res, next) => {
//     console.error('Server error:', err);
//     res.status(500).json({
//         success: false,
//         message: 'Internal server error',
//         error: process.env.NODE_ENV === 'development' ? err.message : undefined
//     });
// });

// // ============================================
// // START SERVER
// // ============================================

// app.listen(PORT, () => {
//     console.log('============================================');
//     console.log('🚀 CAHAYA PHONE CRM - BACKEND SERVER');
//     console.log('============================================');
//     console.log(`📡 Server running on: http://localhost:${PORT}`);
//     console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
//     console.log(`📊 Database: ${process.env.DB_NAME}`);
//     console.log('============================================');
//     console.log('📋 Available endpoints:');
//     console.log('   POST /api/form-submit');
//     console.log('   POST /api/webhook/whatsapp');
//     console.log('   POST /api/admin/login');
//     console.log('   GET  /api/admin/stats');
//     console.log('   GET  /api/admin/customers');
//     console.log('   GET  /api/admin/messages');
//     console.log('============================================');
// });

// // Handle graceful shutdown
// process.on('SIGTERM', () => {
//     console.log('SIGTERM signal received: closing HTTP server');
//     server.close(() => {
//         console.log('HTTP server closed');
//     });
// });

// ============================================
// CAHAYA PHONE CRM - MAIN SERVER
// ============================================

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

// Import routes
const apiRoutes = require('./routes/api');

// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// MIDDLEWARE
// ============================================

// CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(o => o !== "");

// Add your fallbacks if the env variable is empty
const finalAllowedList = allowedOrigins.length > 0 
    ? allowedOrigins 
    : ['http://localhost:3000', 'https://cahayaphonecrm.up.railway.app'];

app.use(cors({
    origin: function (origin, callback) {
        // 1. Allow non-browser requests (Postman, curl, etc.)
        if (!origin) return callback(null, true);

        // 2. Exact match check
        if (finalAllowedList.indexOf(origin) !== -1) {
            return callback(null, true);
        }

        // 3. Robust check (removes trailing slashes for comparison)
        const sanitizedOrigin = origin.replace(/\/$/, "");
        const isMatch = finalAllowedList.some(allowed => allowed.replace(/\/$/, "") === sanitizedOrigin);

        if (isMatch) {
            callback(null, true);
        } else {
            console.error(`[CORS REJECTED] Origin: "${origin}"`);
            console.log(`[CORS ALLOWED LIST]`, finalAllowedList);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200 // Essential for older browsers/legacy support
}));

// Body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ============================================
// SERVE FRONTEND BASED ON APP_TYPE
// ============================================
const APP_TYPE = process.env.APP_TYPE || 'both';

console.log(`[Frontend] APP_TYPE: ${APP_TYPE}`);

if (APP_TYPE === 'admin') {
    // Admin-only deployment
    console.log('[Frontend] Serving ADMIN files only');
    app.use(express.static(path.join(__dirname, '..', 'admin')));
} else if (APP_TYPE === 'customer') {
    // Customer-only deployment
    console.log('[Frontend] Serving CUSTOMER files only');
    app.use(express.static(path.join(__dirname, '..', 'customer')));
} else {
    // Both (default - original behavior)
    console.log('[Frontend] Serving BOTH customer and admin files');
    app.use(express.static(path.join(__dirname, '..', 'customer')));
    app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));
}

// Request logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'Cahaya Phone CRM API is running',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// API routes
app.use('/api', apiRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ============================================
// START SERVER
// ============================================

const server = app.listen(PORT, () => {
    console.log('============================================');
    console.log('🚀 CAHAYA PHONE CRM - BACKEND SERVER');
    console.log('============================================');
    console.log(`📡 Server running on port: ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`📊 Database configured from:`, process.env.MYSQL_URL ? 'MYSQL_URL' : process.env.DATABASE_URL ? 'DATABASE_URL' : 'Individual DB_* variables');
    console.log(`🔌 CORS Origins:`, process.env.ALLOWED_ORIGINS || 'All origins (dev mode)');
    console.log('============================================');
    console.log('📋 Available endpoints:');
    console.log('   POST /api/form-submit');
    console.log('   POST /api/webhook/whatsapp');
    console.log('   POST /api/admin/login');
    console.log('   GET  /api/admin/stats');
    console.log('   GET  /api/admin/customers');
    console.log('   GET  /api/admin/messages');
    console.log('   POST /api/admin/forgot');
    console.log('   GET  /api/admin/reset/validate');
    console.log('   POST /api/admin/reset');
    console.log('============================================');
});

// Auto-expire 'New' status -> 'Old' after configured hours
const db = require('./config/database');
const STATUS_EXPIRE_HOURS = parseInt(process.env.STATUS_EXPIRE_HOURS || '24', 10);
const STATUS_OLD_LABEL = process.env.STATUS_OLD_LABEL || 'Old';

async function runStatusExpiry() {
    try {
        const [result] = await db.query(
            `UPDATE customers SET status = ? WHERE status = 'New' AND created_at < DATE_SUB(NOW(), INTERVAL ${STATUS_EXPIRE_HOURS} HOUR)`,
            [STATUS_OLD_LABEL]
        );
        const affectedRows = result && typeof result.affectedRows === 'number' ? result.affectedRows : (result && result.affectedRows) || 0;
        console.log(`🔁 Status expiry job: set ${affectedRows} customer(s) from 'New' to '${STATUS_OLD_LABEL}' (older than ${STATUS_EXPIRE_HOURS} hours)`);
    } catch (err) {
        console.error('❌ Status expiry job failed:', err);
    }
}

// Run once at startup and then hourly
runStatusExpiry();
setInterval(runStatusExpiry, 60 * 60 * 1000);

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});