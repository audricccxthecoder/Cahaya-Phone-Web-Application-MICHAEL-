// ============================================
// WEBHOOK CONTROLLER
// Handle incoming WhatsApp messages
//
// ATURAN EMAS:
// - Chat manual (Skenario B): HANYA save DB + Google Contact
//   Format: "Customer - DD/MM/YYYY". TIDAK kirim auto-reply.
// - Auto-reply HANYA dari formController (Skenario A).
// ============================================

const db = require('../config/database');
const googleService = require('../config/google');

/**
 * Handle incoming message dari WA Client (event internal, bukan HTTP)
 * Dipanggil langsung dari server.js saat WA Client emit 'message_received'
 */
exports.handleIncomingMessage = async (data) => {
    try {
        const { sender: phoneNumber, message, pushname: senderName } = data;
        const cleanPhone = phoneNumber.replace(/\D/g, '');

        console.log(`[WEBHOOK] Processing: ${senderName} (${cleanPhone}): ${message.substring(0, 50)}...`);

        const { rows: existing } = await db.query(
            'SELECT id, nama_lengkap, status, tipe FROM customers WHERE whatsapp = $1',
            [cleanPhone]
        );

        let customerId;
        let customerStatus;

        if (existing.length > 0) {
            // Customer sudah ada
            customerId = existing[0].id;
            const currentStatus = existing[0].status;

            // Auto status transitions
            if (['New', 'Inactive', 'Follow Up'].includes(currentStatus)) {
                await db.query('UPDATE customers SET status = $1 WHERE id = $2', ['Contacted', customerId]);
                customerStatus = 'Contacted';
            } else {
                customerStatus = currentStatus;
            }

            console.log(`[WEBHOOK] Existing customer: ${customerId} (${currentStatus} -> ${customerStatus})`);

            // Update nama dari pushname jika berubah
            if (senderName && senderName !== existing[0].nama_lengkap) {
                try {
                    await googleService.saveContact({
                        nama_lengkap: senderName,
                        whatsapp: cleanPhone,
                        tipe: existing[0].tipe || 'Chat Only'
                    });
                    await db.query('UPDATE customers SET nama_lengkap = $1 WHERE id = $2', [senderName, customerId]);
                    console.log(`[WEBHOOK] Google Contact updated: ${existing[0].nama_lengkap} -> ${senderName}`);
                } catch (gcErr) {
                    console.warn('[WEBHOOK] Google Contact update failed:', gcErr.message);
                }
            }
        } else {
            // ============================================
            // SKENARIO B: Customer BARU chat manual
            // Save ke DB + Google Contact ("Customer - Tanggal")
            // TIDAK kirim auto-reply — biarkan WA Business bawaan
            // ============================================
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

            console.log(`[WEBHOOK] New customer (Chat Only): ${customerId} — NO auto-reply`);

            // Auto-save ke Google Contacts (format: "Customer - DD/MM/YYYY")
            try {
                await googleService.saveContact({
                    nama_lengkap: customerName,
                    whatsapp: cleanPhone,
                    source,
                    tipe: 'Chat Only'
                });
            } catch (gcErr) {
                console.warn('[WEBHOOK] Google Contact save failed:', gcErr.message);
            }

            // BERHENTI DI SINI. TIDAK kirim auto-reply.
            // WA Business bawaan yang handle reply.
        }

        // Simpan pesan ke database
        await db.query(
            'INSERT INTO messages (customer_id, direction, message) VALUES ($1, $2, $3)',
            [customerId, 'in', message]
        );

        console.log(`[WEBHOOK] Message saved for customer: ${customerId}`);
        return { success: true, customer_id: customerId, status: customerStatus };

    } catch (error) {
        console.error('[WEBHOOK] Error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * HTTP Webhook endpoint (untuk Fonnte / external WA API fallback)
 * POST /api/webhook/whatsapp
 */
exports.handleWhatsAppWebhook = async (req, res) => {
    try {
        console.log('[WEBHOOK HTTP] Received:', JSON.stringify(req.body, null, 2));

        let data;

        // Format WA Bridge / internal
        if (req.body.source === 'wa-bridge') {
            data = {
                sender: req.body.sender,
                message: req.body.message,
                pushname: req.body.pushname || ''
            };
        }
        // Format Fonnte
        else if (req.body.sender) {
            data = {
                sender: req.body.sender,
                message: req.body.message,
                pushname: req.body.member?.name || ''
            };
        }
        // Format Wablas
        else if (req.body.phone) {
            data = {
                sender: req.body.phone,
                message: req.body.message,
                pushname: req.body.pushname || ''
            };
        }
        else {
            return res.status(400).json({ success: false, message: 'Invalid webhook payload' });
        }

        const result = await exports.handleIncomingMessage(data);
        res.json(result);

    } catch (error) {
        console.error('[WEBHOOK HTTP] Error:', error);
        res.json({ success: false, message: 'Error processing webhook', error: error.message });
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
