const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Configuration - LETAKKAN DI SINI (sebelum routes)
const allowedOrigins = [
  'https://cahayaphone-customer.up.railway.app',
  'https://cahaya-phone-production-9701.up.railway.app',
  'https://cahayaphonecrm.up.railway.app',
  'http://localhost:3000',
  'http://localhost:5000'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list or contains railway.app
    if (allowedOrigins.includes(origin) || origin.includes('.railway.app')) {
      callback(null, true);
    } else {
      console.log('⚠️ CORS blocked origin:', origin);
      // Untuk development, izinkan semua
      callback(null, true); 
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Database connection pool
let pool;

async function initDatabase() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    // Test connection
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Cahaya Phone CRM API',
    timestamp: new Date().toISOString()
  });
});

// API Routes

// 1. Create Customer (dari form customer)
app.post('/api/customers', async (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    
    // Validasi
    if (!name || !phone) {
      return res.status(400).json({ 
        error: 'Name and phone are required' 
      });
    }

    const [result] = await pool.query(
      'INSERT INTO customers (name, phone, email, address, notes, status) VALUES (?, ?, ?, ?, ?, ?)',
      [name, phone, email || null, address || null, notes || null, 'New']
    );

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      customerId: result.insertId
    });

  } catch (error) {
    console.error('Error creating customer:', error);
    
    // Handle duplicate phone
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        error: 'Phone number already exists' 
      });
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// 2. Get All Customers (untuk admin dashboard)
app.get('/api/customers', async (req, res) => {
  try {
    const { status, search } = req.query;
    
    let query = 'SELECT * FROM customers WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC';

    const [customers] = await pool.query(query, params);
    
    res.json({
      success: true,
      data: customers,
      count: customers.length
    });

  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// 3. Update Customer Status
app.put('/api/customers/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['New', 'Contacted', 'Qualified', 'Old'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status' 
      });
    }

    const [result] = await pool.query(
      'UPDATE customers SET status = ? WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        error: 'Customer not found' 
      });
    }

    res.json({
      success: true,
      message: 'Status updated successfully'
    });

  } catch (error) {
    console.error('Error updating customer status:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// 4. Admin Login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }

    const [admins] = await pool.query(
      'SELECT * FROM admins WHERE username = ?',
      [username]
    );

    if (admins.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    const admin = admins[0];
    const bcrypt = require('bcryptjs');
    const isValid = await bcrypt.compare(password, admin.password);

    if (!isValid) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Update last login
    await pool.query(
      'UPDATE admins SET last_login = NOW() WHERE id = ?',
      [admin.id]
    );

    res.json({
      success: true,
      message: 'Login successful',
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        full_name: admin.full_name,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// 5. Get Customer Statistics
app.get('/api/admin/stats', async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'New' THEN 1 ELSE 0 END) as new,
        SUM(CASE WHEN status = 'Contacted' THEN 1 ELSE 0 END) as contacted,
        SUM(CASE WHEN status = 'Qualified' THEN 1 ELSE 0 END) as qualified,
        SUM(CASE WHEN status = 'Old' THEN 1 ELSE 0 END) as old
      FROM customers
    `);

    res.json({
      success: true,
      data: stats[0]
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

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

// Start server
const PORT = process.env.PORT || 5000;

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📅 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
});