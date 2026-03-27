const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// ============================================
// MIDDLEWARE
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS — izinkan frontend Vercel mengakses backend Railway
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
    : [];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc)
        if (!origin) return callback(null, true);
        // Allow all in dev, or check whitelist in production
        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(null, true); // Allow all for now
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ============================================
// SERVE STATIC FRONTEND
// Selalu serve frontend files (Vercel, Railway, maupun local dev)
// Nanti kalau frontend pindah ke Vercel terpisah, backend Railway
// tidak perlu serve static lagi — tapi untuk sekarang tetap serve
// ============================================
app.use('/config.js', express.static(path.join(__dirname, '../config.js')));
app.use('/customer', express.static(path.join(__dirname, '../customer')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));

app.get('/', (req, res) => {
    res.redirect('/customer');
});

// Health check
app.get('/api/health', async (req, res) => {
    const db = require('./config/database');
    try {
        const result = await db.query('SELECT NOW() as time');
        const whatsappService = require('./config/whatsapp');
        const waStatus = whatsappService.getStatus();
        res.json({
            status: 'OK',
            db: 'connected',
            time: result.rows[0].time,
            wa: waStatus.status || 'not initialized',
            mode: process.env.VERCEL ? 'serverless' : 'persistent'
        });
    } catch (err) {
        res.status(500).json({ status: 'ERROR', db: 'failed', error: err.message });
    }
});

// API Routes
app.use('/api', require('./routes/api'));

// Error handling
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// ============================================
// START SERVER
// ============================================

// Vercel = serverless, export app saja
if (process.env.VERCEL) {
    module.exports = app;
} else {
    // Railway / local dev = persistent server + WA Client
    const cron = require('node-cron');
    const PORT = process.env.PORT || 5000;

    app.listen(PORT, async () => {
        console.log(`
========================================
  Cahaya Phone Backend + WA Bridge
  Running on port ${PORT}
  Mode: PERSISTENT (Railway/Local)
========================================
        `);

        // Initialize WhatsApp Client (HANYA di persistent server)
        try {
            const waClient = require('./config/wa-client');
            const whatsappService = require('./config/whatsapp');
            const webhookController = require('./controllers/webhookController');

            // Connect WA Client ke WhatsApp Service
            whatsappService.setWAClient(waClient);

            // WA Bridge BODOH: chat masuk → lapor ke Backend
            // Backend yang handle semua logika (save DB, save Google Contact, dll)
            waClient.on('message_received', async (data) => {
                try {
                    await webhookController.handleIncomingMessage(data);
                } catch (err) {
                    console.error('[WA] Failed to handle incoming message:', err.message);
                }
            });

            // Initialize WA Client
            await waClient.initialize();
            console.log('[WA] WhatsApp client initialized');
        } catch (err) {
            console.error('[WA] Failed to initialize:', err.message);
            console.log('[WA] Server will continue without WhatsApp. Use Fonnte fallback.');
        }

        // Birthday greeting cron — setiap hari jam 8 pagi WIB (01:00 UTC)
        const birthdayController = require('./controllers/birthdayController');
        cron.schedule('0 8 * * *', () => {
            console.log('[Cron] Running birthday check...');
            birthdayController.cronCheckBirthdays();
        }, { timezone: 'Asia/Makassar' });
        console.log('[Cron] Birthday greeting scheduled: every day at 08:00 WITA');
    });
}
