// ============================================
// AUTHENTICATION MIDDLEWARE
// Verify JWT token untuk protected routes
// ============================================

const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(403).json({
                success: false,
                message: 'Token tidak ditemukan'
            });
        }

        // Verify token
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({
                    success: false,
                    message: 'Token tidak valid atau expired'
                });
            }

            // Attach user info to request
            req.admin = decoded;
            next();
        });

    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Error validating token'
        });
    }
};

module.exports = authMiddleware;