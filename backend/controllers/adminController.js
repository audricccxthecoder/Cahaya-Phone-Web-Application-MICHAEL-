// ============================================
// ADMIN CONTROLLER
// Handle admin authentication & data
// ============================================

const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Login admin
 * POST /api/admin/login
 */
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        console.log('🔐 Login attempt:', username);

        // Cari admin
        const [admins] = await db.query(
            'SELECT * FROM admins WHERE username = ?',
            [username]
        );

        if (admins.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Username atau password salah'
            });
        }

        const admin = admins[0];

        // Verify password
        const isValid = await bcrypt.compare(password, admin.password);

        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: 'Username atau password salah'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: admin.id, username: admin.username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('✅ Login successful:', username);

        res.json({
            success: true,
            message: 'Login berhasil',
            token: token,
            admin: {
                id: admin.id,
                username: admin.username,
                nama: admin.nama
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

/**
 * Get dashboard statistics
 * GET /api/admin/stats
 */
exports.getStats = async (req, res) => {
    try {
        // Get statistics dari view
        const [stats] = await db.query('SELECT * FROM customer_stats');

        res.json({
            success: true,
            data: stats[0]
        });

    } catch (error) {
        console.error('❌ Stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil statistik'
        });
    }
};

/**
 * Get all customers
 * GET /api/admin/customers
 */
exports.getCustomers = async (req, res) => {
    try {
        const [customers] = await db.query(
            `SELECT 
                id, nama_lengkap, nama_sales, merk_unit, tipe_unit,
                harga, qty, whatsapp, metode_pembayaran,
                source, status, created_at
            FROM customers 
            ORDER BY created_at DESC`
        );

        res.json({
            success: true,
            data: customers
        });

    } catch (error) {
        console.error('❌ Get customers error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data customer'
        });
    }
};

/**
 * Get customer detail by ID
 * GET /api/admin/customers/:id
 */
exports.getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;

        const [customers] = await db.query(
            'SELECT * FROM customers WHERE id = ?',
            [id]
        );

        if (customers.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Customer tidak ditemukan'
            });
        }

        res.json({
            success: true,
            data: customers[0]
        });

    } catch (error) {
        console.error('❌ Get customer error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data customer'
        });
    }
};

/**
 * Get all messages (chat log)
 * GET /api/admin/messages
 */
exports.getMessages = async (req, res) => {
    try {
        const [messages] = await db.query(
            `SELECT 
                m.id, m.customer_id, m.direction, m.message, m.sent_at,
                c.nama_lengkap, c.whatsapp
            FROM messages m
            JOIN customers c ON m.customer_id = c.id
            ORDER BY m.sent_at DESC
            LIMIT 100`
        );

        res.json({
            success: true,
            data: messages
        });

    } catch (error) {
        console.error('❌ Get messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data pesan'
        });
    }
};

/**
 * Debug: list admins (development only)
 * GET /api/debug/admins
 */
exports.debugAdmins = async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    try {
        const [rows] = await db.query('SELECT id, username, nama FROM admins');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('❌ Debug admins error:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil admins' });
    }
};

/**
 * Update admin profile (name)
 * PATCH /api/admin/profile
 */
exports.updateProfile = async (req, res) => {
    try {
        const { nama } = req.body;
        const adminId = req.admin && req.admin.id;

        if (!adminId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        if (!nama || String(nama).trim() === '') {
            return res.status(400).json({ success: false, message: 'Nama tidak boleh kosong' });
        }

        await db.query('UPDATE admins SET nama = ? WHERE id = ?', [String(nama).trim(), adminId]);

        res.json({ success: true, message: 'Profil diperbarui', data: { id: adminId, nama: String(nama).trim() } });
    } catch (error) {
        console.error('❌ Update profile error:', error);
        res.status(500).json({ success: false, message: 'Gagal memperbarui profil' });
    }
};

/**
 * Change username/password
 * PATCH /api/admin/credentials
 */
exports.changeCredentials = async (req, res) => {
    try {
        const adminId = req.admin && req.admin.id;
        const { current_password, new_password, new_username, nama } = req.body;

        if (!adminId) return res.status(401).json({ success: false, message: 'Unauthorized' });
        if (!current_password) return res.status(400).json({ success: false, message: 'Current password is required' });

        // Fetch current admin
        const [rows] = await db.query('SELECT * FROM admins WHERE id = ?', [adminId]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Admin not found' });

        const admin = rows[0];
        const isValid = await require('bcryptjs').compare(current_password, admin.password);
        if (!isValid) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

        const updates = [];
        const params = [];

        // Update username if provided and different
        if (new_username && String(new_username).trim() !== admin.username) {
            // Check uniqueness
            const [u] = await db.query('SELECT id FROM admins WHERE username = ? AND id != ?', [String(new_username).trim(), adminId]);
            if (u.length > 0) return res.status(409).json({ success: false, message: 'Username already taken' });
            updates.push('username = ?'); params.push(String(new_username).trim());
        }

        // Update name if provided
        if (nama && String(nama).trim() !== admin.nama) {
            updates.push('nama = ?'); params.push(String(nama).trim());
        }

        // Update password if provided
        let passwordChanged = false;
        if (new_password) {
            if (String(new_password).length < 6) return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
            const hashed = await require('bcryptjs').hash(new_password, 10);
            updates.push('password = ?'); params.push(hashed);
            passwordChanged = true;
        }

        if (updates.length > 0) {
            params.push(adminId);
            await db.query(`UPDATE admins SET ${updates.join(', ')} WHERE id = ?`, params);
        }

        // Generate new token so client can continue without forcing logout
        const token = require('jsonwebtoken').sign({ id: adminId, username: new_username ? String(new_username).trim() : admin.username }, process.env.JWT_SECRET, { expiresIn: '24h' });

        const responseData = { id: adminId, username: new_username ? String(new_username).trim() : admin.username, nama: nama ? String(nama).trim() : admin.nama };

        res.json({ success: true, message: 'Credentials updated', token, data: responseData });

    } catch (error) {
        console.error('❌ Change credentials error:', error);
        res.status(500).json({ success: false, message: 'Gagal mengubah credentials' });
    }
};

/**
 * Get messages by customer ID
 * GET /api/admin/messages/:customerId
 */
exports.getMessagesByCustomer = async (req, res) => {
    try {
        const { customerId } = req.params;

        const [messages] = await db.query(
            `SELECT * FROM messages 
            WHERE customer_id = ? 
            ORDER BY sent_at ASC`,
            [customerId]
        );

        res.json({
            success: true,
            data: messages
        });

    } catch (error) {
        console.error('❌ Get customer messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil pesan customer'
        });
    }
};

/**
 * POST /api/admin/forgot
 * Body: { usernameOrEmail }
 */
exports.forgotPassword = async (req, res) => {
    try {
        const { usernameOrEmail } = req.body;
        if (!usernameOrEmail) return res.status(400).json({ success: false, message: 'username or email is required' });

        // Find admin by username or email
        const [rows] = await db.query('SELECT id, username, email, nama FROM admins WHERE username = ? OR email = ?', [usernameOrEmail, usernameOrEmail]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Admin not found' });
        const admin = rows[0];

        // Generate token
        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + (60 * 60 * 1000)); // 1 hour

        await db.query('INSERT INTO admin_reset_tokens (admin_id, token, expires_at) VALUES (?, ?, ?)', [admin.id, token, expiresAt]);

        // Try to send email if configured
        const nodemailer = require('nodemailer');
        if (process.env.MAIL_HOST && process.env.MAIL_USER) {
            const transporter = nodemailer.createTransport({
                host: process.env.MAIL_HOST,
                port: Number(process.env.MAIL_PORT) || 587,
                secure: (process.env.MAIL_SECURE === 'true'),
                auth: {
                    user: process.env.MAIL_USER,
                    pass: process.env.MAIL_PASS
                }
            });

            const from = process.env.MAIL_FROM || process.env.MAIL_USER;
            const frontend = process.env.FRONTEND_URL || 'http://localhost:5500';
            const resetLink = `${frontend.replace(/\/$/, '')}/admin/reset.html?token=${token}`;

            await transporter.sendMail({
                from,
                to: admin.email || process.env.MAIL_USER,
                subject: 'Reset password admin - Cahaya Phone',
                text: `Halo ${admin.nama || admin.username},\n\nGunakan link berikut untuk mereset password Anda (berlaku 1 jam): ${resetLink}\n\nJika Anda tidak meminta ini, abaikan pesan ini.`,
                html: `<p>Halo ${admin.nama || admin.username},</p><p>Gunakan link berikut untuk mereset password Anda (berlaku 1 jam): <a href="${resetLink}">${resetLink}</a></p><p>Jika Anda tidak meminta ini, abaikan pesan ini.</p>`
            });

            return res.json({ success: true, message: 'Reset link dikirim ke email admin (jika terdaftar).' });
        }

        // Fallback for dev: return token in response if mail not configured (developer mode)
        return res.json({ success: true, message: 'Reset token created (no mail configured)', token });
    } catch (error) {
        console.error('❌ Forgot password error:', error);
        res.status(500).json({ success: false, message: 'Gagal membuat reset token' });
    }
};

/**
 * GET /api/admin/reset/validate?token=...
 */
exports.validateResetToken = async (req, res) => {
    try {
        const token = req.query.token;
        if (!token) return res.status(400).json({ success: false, message: 'Token is required' });

        const [rows] = await db.query('SELECT id, admin_id, expires_at, used FROM admin_reset_tokens WHERE token = ?', [token]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Token not found' });
        const rec = rows[0];
        if (rec.used) return res.status(400).json({ success: false, message: 'Token already used' });
        if (new Date(rec.expires_at) < new Date()) return res.status(400).json({ success: false, message: 'Token expired' });

        res.json({ success: true, message: 'Token valid' });
    } catch (error) {
        console.error('❌ Validate token error:', error);
        res.status(500).json({ success: false, message: 'Gagal validasi token' });
    }
};

/**
 * POST /api/admin/reset
 * Body: { token, new_password }
 */
exports.resetPassword = async (req, res) => {
    try {
        const { token, new_password } = req.body;
        if (!token || !new_password) return res.status(400).json({ success: false, message: 'Token and new_password are required' });

        const [rows] = await db.query('SELECT id, admin_id, expires_at, used FROM admin_reset_tokens WHERE token = ?', [token]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Token not found' });
        const rec = rows[0];
        if (rec.used) return res.status(400).json({ success: false, message: 'Token already used' });
        if (new Date(rec.expires_at) < new Date()) return res.status(400).json({ success: false, message: 'Token expired' });

        // Update password
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash(new_password, 10);
        await db.query('UPDATE admins SET password = ? WHERE id = ?', [hash, rec.admin_id]);

        // Mark token used
        await db.query('UPDATE admin_reset_tokens SET used = 1 WHERE id = ?', [rec.id]);

        res.json({ success: true, message: 'Password telah direset' });
    } catch (error) {
        console.error('❌ Reset password error:', error);
        res.status(500).json({ success: false, message: 'Gagal mereset password' });
    }
};