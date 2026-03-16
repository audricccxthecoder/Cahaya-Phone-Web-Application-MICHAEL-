const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS - izinkan semua origin (frontend dan backend satu server)
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Serve static frontend files
app.use('/customer', express.static(path.join(__dirname, '../customer')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// Health check + redirect ke customer form
app.get('/', (req, res) => {
  res.redirect('/customer');
});

// DB connection test (temporary debug endpoint)
app.get('/api/health', async (req, res) => {
  const db = require('./config/database');
  try {
    const result = await db.query('SELECT NOW() as time');
    res.json({
      status: 'OK',
      db: 'connected',
      time: result.rows[0].time,
      DATABASE_URL_set: !!process.env.DATABASE_URL,
      JWT_SECRET_set: !!process.env.JWT_SECRET
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      db: 'failed',
      error: err.message,
      DATABASE_URL_set: !!process.env.DATABASE_URL,
      JWT_SECRET_set: !!process.env.JWT_SECRET
    });
  }
});

// API Routes (dari controllers)
app.use('/api', require('./routes/api'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Something went wrong!',
    details: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found'
  });
});

// Start server (local dev) — Vercel uses module.exports instead of listen
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📅 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;