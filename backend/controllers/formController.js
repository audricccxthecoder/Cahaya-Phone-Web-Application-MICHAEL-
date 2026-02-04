    // ============================================
// FORM CONTROLLER
// Handle customer form submissions```
// ============================================

const db = require('../config/database');
const whatsappService = require('../config/whatsapp');

/**
 * Submit customer form
 * POST /api/form-submit
 */
exports.submitForm = async (req, res) => {
    try {
        const {
            nama, nama_lengkap, email, whatsapp, alamat, kota,
            nama_sales, merk_unit, tipe_unit, harga, qty,
            tanggal_lahir, metode_pembayaran, tahu_dari
        } = req.body;

        const finalName = nama || nama_lengkap;

        // Basic validation
        if (!finalName || !whatsapp) {
            return res.status(400).json({
                success: false,
                message: 'Nama dan No. WhatsApp wajib diisi'
            });
        }

        // Clean phone number
        const cleanPhone = whatsapp.replace(/\D/g, '');

        // Combine address/email/kota into alamat field
        const extra = [];
        if (kota) extra.push(`Kota: ${kota}`);
        if (email) extra.push(`Email: ${email}`);
        const fullAddress = [alamat, extra.join(' | ')].filter(Boolean).join(' | ');

        // Prepare numeric values
        const parsedHarga = harga ? parseFloat(harga) : null;
        const parsedQty = qty ? parseInt(qty, 10) : 1;

        // Determine source based on `tahu_dari` (map common inputs to canonical sources)
        let source = 'Website';
        if (tahu_dari) {
            const td = String(tahu_dari).trim();
            const tdLower = td.toLowerCase();

            // Mapping table (regex) for common inputs
            const mappings = [
                {pattern: /instagram/i, name: 'Instagram'},
                {pattern: /website/i, name: 'Website'},
                {pattern: /facebook/i, name: 'Facebook'},
                {pattern: /tiktok/i, name: 'TikTok'},
                {pattern: /(teman|temen|keluarga)/i, name: 'Teman/Keluarga'}
            ];

            const found = mappings.find(m => m.pattern.test(tdLower));
            if (found) {
                source = found.name;
            } else if (td.trim() === '') {
                source = 'Website';
            } else {
                // Normalize unknown inputs: capitalize words
                source = td.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            }
        }

        // Debug log to help verify mapping
        console.log(`🧭 Determined source from tahu_dari='${tahu_dari}' -> source='${source}'`);

        // Insert customer with all fields (use computed source)
        const [result] = await db.query(
            `INSERT INTO customers (
                nama_lengkap, nama_sales, merk_unit, tipe_unit, harga, qty,
                tanggal_lahir, alamat, whatsapp, metode_pembayaran, tahu_dari, source, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'New')`,
            [
                finalName,
                nama_sales || null,
                merk_unit || null,
                tipe_unit || null,
                parsedHarga,
                parsedQty,
                tanggal_lahir || null,
                fullAddress,
                cleanPhone,
                metode_pembayaran || null,
                tahu_dari || null,
                source
            ]
        );

        const customerId = result.insertId;

        // Log an outbound auto-reply message
        await db.query(
            `INSERT INTO messages (customer_id, direction, message) VALUES (?, 'out', ?)`,
            [customerId, `Terima kasih ${finalName}, data Anda telah kami terima. Tim kami akan menghubungi segera.`]
        );

        // Send WhatsApp auto-reply (best-effort)
        try {
            await whatsappService.sendAutoReply({ nama_lengkap: finalName, whatsapp: cleanPhone });
        } catch (waError) {
            console.warn('⚠️ WhatsApp auto-reply failed:', waError.message || waError);
        }

        res.json({
            success: true,
            message: 'Pendaftaran berhasil. Terima kasih!',
            customer_id: customerId
        });

    } catch (error) {
        console.error('❌ Form submit error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal memproses pendaftaran',
            error: error.message
        });
    }
};