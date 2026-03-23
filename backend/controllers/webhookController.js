// ============================================
// WEBHOOK CONTROLLER
// Handle incoming WhatsApp messages
// ============================================

const db = require('../config/database');
const whatsappService = require('../config/whatsapp');
const googleService = require('../config/google');

/**
 * Webhook untuk menerima pesan WhatsApp masuk
 * POST /api/webhook/whatsapp
 */
exports.handleWhatsAppWebhook = async (req, res) => {
    try {
        console.log('📥 Webhook received:', JSON.stringify(req.body, null, 2));

        let phoneNumber, message, senderName;

        // Format WA Bridge (whatsapp-web.js)
        if (req.body.source === 'wa-bridge') {
            phoneNumber = req.body.sender;
            message = req.body.message;
            senderName = req.body.pushname || '';
        }
        // Format Fonnte
        else if (req.body.sender) {
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

        const cleanPhone = phoneNumber.replace(/\D/g, '');

        const { rows: existing } = await db.query(
            'SELECT id, nama_lengkap, status FROM customers WHERE whatsapp = $1',
            [cleanPhone]
        );

        let customerId;
        let customerStatus;

        if (existing.length > 0) {
            customerId = existing[0].id;
            const currentStatus = existing[0].status;

            // Auto status transitions on incoming chat:
            // New → Contacted, Inactive → Contacted, Follow Up → Contacted
            // Completed stays Completed (sudah beli)
            if (['New', 'Inactive', 'Follow Up'].includes(currentStatus)) {
                await db.query(
                    'UPDATE customers SET status = $1 WHERE id = $2',
                    ['Contacted', customerId]
                );
                customerStatus = 'Contacted';
            } else {
                customerStatus = currentStatus;
            }

            console.log(`✅ Existing customer: ${customerId} (${currentStatus} → ${customerStatus})`);

            // Update Google Contact (nama bisa berubah dari pushname)
            if (senderName && senderName !== existing[0].nama_lengkap) {
                try {
                    await googleService.saveContact({
                        nama_lengkap: senderName,
                        whatsapp: cleanPhone,
                        tipe: existing[0].tipe || 'Chat Only'
                    });
                    await db.query('UPDATE customers SET nama_lengkap = $1 WHERE id = $2', [senderName, customerId]);
                    console.log(`✅ Google Contact updated: ${existing[0].nama_lengkap} → ${senderName}`);
                } catch (gcErr) {
                    console.warn('⚠️ Google Contact update failed:', gcErr.message);
                }
            }
        } else {
            let source = 'Unknown';
            const lowerMessage = message.toLowerCase();

            if (lowerMessage.includes('instagram') || lowerMessage.includes('ig')) {
                source = 'Instagram';
            } else if (lowerMessage.includes('facebook') || lowerMessage.includes('fb')) {
                source = 'Facebook';
            } else if (lowerMessage.includes('tiktok')) {
                source = 'TikTok';
            }

            const customerName = senderName || 'Customer Baru';
            const { rows: inserted } = await db.query(
                `INSERT INTO customers (nama_lengkap, whatsapp, source, status, tipe)
                VALUES ($1, $2, $3, 'New', 'Chat Only') RETURNING id`,
                [customerName, cleanPhone, source]
            );

            customerId = inserted[0].id;
            customerStatus = 'New';

            console.log(`✅ New customer created from ${source}: ${customerId}`);

            // Auto-save to Google Contacts
            try {
                await googleService.saveContact({
                    nama_lengkap: customerName,
                    whatsapp: cleanPhone,
                    source,
                    tipe: 'Chat Only'
                });
            } catch (gcErr) {
                console.warn('⚠️ Google Contact save failed:', gcErr.message);
            }

            // Auto-reply untuk chat manual DINONAKTIFKAN
            // Auto-reply hanya untuk customer yang submit form (formController)
            // Chat manual → hanya auto-save kontak, reply biarkan dari fitur WA Business bawaan
            console.log(`✅ Chat manual - no auto-reply, only save contact`);
        }

        await db.query(
            'INSERT INTO messages (customer_id, direction, message) VALUES ($1, $2, $3)',
            [customerId, 'in', message]
        );

        console.log(`✅ Message saved for customer: ${customerId}`);

        res.json({
            success: true,
            message: 'Webhook processed successfully',
            customer_id: customerId,
            status: customerStatus
        });

    } catch (error) {
        console.error('❌ Webhook error:', error);

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
