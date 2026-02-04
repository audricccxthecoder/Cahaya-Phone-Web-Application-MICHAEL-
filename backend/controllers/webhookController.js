// ============================================
// WEBHOOK CONTROLLER
// Handle incoming WhatsApp messages
// ============================================

const db = require('../config/database');
const whatsappService = require('../config/whatsapp');

/**
 * Webhook untuk menerima pesan WhatsApp masuk
 * POST /api/webhook/whatsapp
 */
exports.handleWhatsAppWebhook = async (req, res) => {
    try {
        console.log('📥 Webhook received:', JSON.stringify(req.body, null, 2));

        // Parse payload dari Fonnte atau Wablas
        let phoneNumber, message, senderName;

        // Format Fonnte
        if (req.body.sender) {
            phoneNumber = req.body.sender;
            message = req.body.message;
            senderName = req.body.member?.name || '';
        }
        // Format Wablas
        else if (req.body.phone) {
            phoneNumber = req.body.phone;
            message = req.body.message;
            senderName = req.body.pushname || '';
        }
        else {
            return res.status(400).json({
                success: false,
                message: 'Invalid webhook payload'
            });
        }

        // Clean nomor WhatsApp
        const cleanPhone = phoneNumber.replace(/\D/g, '');

        // Cek apakah customer sudah ada
        const [existing] = await db.query(
            'SELECT id, nama_lengkap, status FROM customers WHERE whatsapp = ?',
            [cleanPhone]
        );

        let customerId;
        let customerStatus;

        if (existing.length > 0) {
            // Customer sudah ada
            customerId = existing[0].id;
            customerStatus = 'Existing';

            // Update status jadi Existing
            await db.query(
                'UPDATE customers SET status = ? WHERE id = ?',
                ['Existing', customerId]
            );

            console.log(`✅ Existing customer: ${customerId}`);
        } else {
            // Customer baru dari Instagram/sosmed
            // Deteksi source dari pesan
            let source = 'Unknown';
            const lowerMessage = message.toLowerCase();

            if (lowerMessage.includes('instagram') || lowerMessage.includes('ig')) {
                source = 'Instagram';
            } else if (lowerMessage.includes('facebook') || lowerMessage.includes('fb')) {
                source = 'Facebook';
            } else if (lowerMessage.includes('tiktok')) {
                source = 'TikTok';
            }

            // Insert customer baru
            const [result] = await db.query(
                `INSERT INTO customers (
                    nama_lengkap, whatsapp, source, status
                ) VALUES (?, ?, ?, 'New')`,
                [senderName || 'Customer Baru', cleanPhone, source]
            );

            customerId = result.insertId;
            customerStatus = 'New';

            console.log(`✅ New customer created from ${source}: ${customerId}`);

            // Kirim welcome message untuk customer baru
            await whatsappService.sendWelcomeMessage(cleanPhone, senderName);
        }

        // Simpan pesan masuk ke database
        await db.query(
            'INSERT INTO messages (customer_id, direction, message) VALUES (?, ?, ?)',
            [customerId, 'in', message]
        );

        console.log(`✅ Message saved for customer: ${customerId}`);

        // Response sukses ke webhook
        res.json({
            success: true,
            message: 'Webhook processed successfully',
            customer_id: customerId,
            status: customerStatus
        });

    } catch (error) {
        console.error('❌ Webhook error:', error);
        
        // Tetap return 200 agar webhook tidak retry terus
        res.json({
            success: false,
            message: 'Error processing webhook',
            error: error.message
        });
    }
};

/**
 * Test webhook endpoint
 * GET /api/webhook/test
 */
exports.testWebhook = (req, res) => {
    res.json({
        success: true,
        message: 'Webhook endpoint is working',
        timestamp: new Date().toISOString()
    });
};