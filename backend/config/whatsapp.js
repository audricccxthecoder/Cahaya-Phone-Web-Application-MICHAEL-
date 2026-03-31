// ============================================
// WHATSAPP SERVICE
// Semua logika kirim pesan ada di sini.
// Pakai WA Client langsung (bukan HTTP ke bridge).
// Fallback ke Fonnte jika WA Client tidak aktif.
// ============================================

const axios = require('axios');
const { sanitizePhone } = require('../utils/phoneUtils');
require('dotenv').config();

class WhatsAppService {
    constructor() {
        // WA Client (terintegrasi, bukan HTTP)
        this.waClient = null;

        // Fonnte config (fallback / legacy)
        this.apiUrl = process.env.WHATSAPP_API_URL;
        this.apiKey = process.env.WHATSAPP_API_KEY;

        // Rate limiter for Fonnte fallback
        this._lastSent = 0;
        this._minInterval = 1000;
    }

    /**
     * Set WA Client reference (dipanggil dari server.js saat init)
     */
    setWAClient(client) {
        this.waClient = client;
    }

    /**
     * Cek apakah WA Client aktif dan ready
     */
    get isWAReady() {
        return this.waClient && this.waClient.state && this.waClient.state.status === 'ready';
    }

    /**
     * Send a single WhatsApp message
     */
    async sendMessage(phoneNumber, message) {
        const formattedNumber = sanitizePhone(phoneNumber);
        if (!formattedNumber || !formattedNumber.startsWith('62')) {
            return { success: false, error: 'Invalid phone number', phone: phoneNumber };
        }

        // Pakai WA Client langsung jika ready
        if (this.isWAReady) {
            return this.waClient.sendMessage(formattedNumber, message, false);
        }

        // Fallback ke Fonnte
        return this._sendViaFonnte(formattedNumber, message);
    }

    /**
     * Send broadcast message (delay lebih lama)
     */
    async sendBroadcastMessage(phoneNumber, message) {
        const formattedNumber = sanitizePhone(phoneNumber);
        if (!formattedNumber || !formattedNumber.startsWith('62')) {
            return { success: false, error: 'Invalid phone number', phone: phoneNumber };
        }

        if (this.isWAReady) {
            return this.waClient.sendMessage(formattedNumber, message, true);
        }

        return this._sendViaFonnte(formattedNumber, message);
    }

    /**
     * Kirim via Fonnte API (fallback/legacy)
     */
    async _sendViaFonnte(phone, message) {
        try {
            const now = Date.now();
            const elapsed = now - this._lastSent;
            if (elapsed < this._minInterval) {
                await new Promise(r => setTimeout(r, this._minInterval - elapsed));
            }
            this._lastSent = Date.now();

            if (!this.apiUrl || !this.apiKey) {
                console.warn('[Fonnte] API not configured');
                return { success: false, error: 'WhatsApp not connected and Fonnte API not configured', phone };
            }

            const response = await axios.post(this.apiUrl, {
                target: phone,
                message: message,
                countryCode: '62'
            }, {
                headers: {
                    'Authorization': this.apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            console.log(`[Fonnte] Sent to ${phone}`);
            return { success: true, phone, data: response.data };
        } catch (error) {
            console.error(`[Fonnte] Failed to ${phone}:`, error.message);
            return { success: false, phone, error: error.message };
        }
    }

    /**
     * Auto-reply after customer submits FORM (Skenario A)
     * HANYA dipanggil dari formController
     */
    async sendAutoReply(customer) {
        const defaultMsg = `Hai Kak ${customer.nama_lengkap}\nTerima Kasih Banyak sudah berbelanja di toko kami CAHAYA PHONE\nSemoga puas dan cocok dengan produknya. Jangan sungkan untuk menghubungi kami lagi ya..`;
        return await this.sendMessage(customer.whatsapp, defaultMsg);
    }

    /**
     * Cek apakah nomor terdaftar di WhatsApp
     */
    async isNumberRegistered(phoneNumber) {
        const formattedNumber = sanitizePhone(phoneNumber);
        if (!formattedNumber || !formattedNumber.startsWith('62')) {
            return { registered: false, error: 'Nomor tidak valid' };
        }

        if (this.isWAReady) {
            try {
                const numberId = await this.waClient.client.getNumberId(formattedNumber).catch(() => null);
                if (!numberId) {
                    return { registered: false, error: `Nomor ${formattedNumber} tidak terdaftar di WhatsApp` };
                }
                return { registered: true };
            } catch (err) {
                return { registered: false, error: err.message };
            }
        }

        // Jika WA Client tidak ready, tidak bisa cek — skip validation
        return { registered: true, unchecked: true };
    }

    /**
     * Get WA Client status (untuk admin dashboard)
     */
    getStatus() {
        if (!this.waClient) {
            return {
                success: true,
                status: 'disconnected',
                mode: this.apiUrl ? 'fonnte' : 'none',
                message: 'WA Client not initialized (serverless mode)'
            };
        }
        return this.waClient.getStatus();
    }

    /**
     * Get daily stats
     */
    getStats() {
        if (!this.waClient) {
            return { success: true, sentToday: 0, dailyLimit: 0, remaining: 0, queueLength: 0 };
        }
        return this.waClient.getStats();
    }
}

module.exports = new WhatsAppService();
