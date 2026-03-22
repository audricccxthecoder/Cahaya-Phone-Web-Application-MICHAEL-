// ============================================
// WHATSAPP SERVICE
// Kirim pesan via WA Bridge (whatsapp-web.js)
// Fallback ke Fonnte jika WA Bridge tidak tersedia
// ============================================

const axios = require('axios');
const { sanitizePhone } = require('../utils/phoneUtils');
require('dotenv').config();

class WhatsAppService {
    constructor() {
        // WA Bridge config (primary)
        this.bridgeUrl = process.env.WA_BRIDGE_URL || '';
        this.bridgeSecret = process.env.WA_BRIDGE_SECRET || 'cahaya-phone-secret-key';

        // Fonnte config (fallback / legacy)
        this.apiUrl = process.env.WHATSAPP_API_URL;
        this.apiKey = process.env.WHATSAPP_API_KEY;

        // Rate limiter for Fonnte fallback
        this._lastSent = 0;
        this._minInterval = 1000;
    }

    /**
     * Cek apakah WA Bridge aktif
     */
    get useBridge() {
        return !!this.bridgeUrl;
    }

    /**
     * Send a single WhatsApp message
     */
    async sendMessage(phoneNumber, message) {
        const formattedNumber = sanitizePhone(phoneNumber);
        if (!formattedNumber || !formattedNumber.startsWith('62')) {
            return { success: false, error: 'Invalid phone number', phone: phoneNumber };
        }

        // Pakai WA Bridge jika tersedia
        if (this.useBridge) {
            return this._sendViaBridge(formattedNumber, message, false);
        }

        // Fallback ke Fonnte
        return this._sendViaFonnte(formattedNumber, message);
    }

    /**
     * Send broadcast message (pakai delay lebih lama di WA Bridge)
     */
    async sendBroadcastMessage(phoneNumber, message) {
        const formattedNumber = sanitizePhone(phoneNumber);
        if (!formattedNumber || !formattedNumber.startsWith('62')) {
            return { success: false, error: 'Invalid phone number', phone: phoneNumber };
        }

        if (this.useBridge) {
            return this._sendViaBridge(formattedNumber, message, true);
        }

        return this._sendViaFonnte(formattedNumber, message);
    }

    /**
     * Kirim via WA Bridge (whatsapp-web.js di Railway)
     */
    async _sendViaBridge(phone, message, isBroadcast) {
        try {
            const endpoint = isBroadcast ? '/api/send-broadcast' : '/api/send';
            const response = await axios.post(`${this.bridgeUrl}${endpoint}`, {
                phone,
                message
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-WA-Secret': this.bridgeSecret
                },
                timeout: 30000 // 30s timeout (broadcast punya delay)
            });

            console.log(`[WA Bridge] Sent to ${phone}`);
            return { success: true, phone, data: response.data };
        } catch (error) {
            const errMsg = error.response?.data?.error || error.message;
            console.error(`[WA Bridge] Failed to ${phone}:`, errMsg);
            return { success: false, phone, error: errMsg };
        }
    }

    /**
     * Kirim via Fontte API (fallback/legacy)
     */
    async _sendViaFonnte(phone, message) {
        try {
            // Rate limiting
            const now = Date.now();
            const elapsed = now - this._lastSent;
            if (elapsed < this._minInterval) {
                await new Promise(r => setTimeout(r, this._minInterval - elapsed));
            }
            this._lastSent = Date.now();

            if (!this.apiUrl || !this.apiKey) {
                console.warn('[Fonnte] API not configured');
                return { success: false, error: 'WhatsApp API not configured', phone };
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
     * Get WA Bridge connection status
     */
    async getBridgeStatus() {
        if (!this.useBridge) {
            return { connected: false, mode: 'fonnte', message: 'Using Fonnte API (no WA Bridge configured)' };
        }

        try {
            const response = await axios.get(`${this.bridgeUrl}/api/status`, {
                headers: { 'X-WA-Secret': this.bridgeSecret },
                timeout: 5000
            });
            return { connected: true, mode: 'bridge', ...response.data };
        } catch (error) {
            return { connected: false, mode: 'bridge', error: error.message };
        }
    }

    /**
     * Ambil pesan auto-reply custom dari WA Bridge
     */
    async _getCustomAutoReply() {
        if (!this.useBridge) return null;
        try {
            const response = await axios.get(`${this.bridgeUrl}/api/auto-reply`, {
                headers: { 'X-WA-Secret': this.bridgeSecret },
                timeout: 5000
            });
            if (response.data && response.data.autoReplyMessage) {
                return response.data.autoReplyMessage;
            }
        } catch (e) {
            // fallback ke default
        }
        return null;
    }

    /**
     * Auto-reply after customer submits form
     * Pakai pesan custom dari WA Bridge jika ada
     */
    async sendAutoReply(customer) {
        const defaultMsg = `Hai Kak ${customer.nama_lengkap}\nTerima Kasih Banyak sudah berbelanja di toko kami CAHAYA PHONE\nSemoga puas dan cocok dengan produknya. Jangan sungkan untuk menghubungi kami lagi ya..`;

        let message = defaultMsg;
        try {
            const customMsg = await this._getCustomAutoReply();
            if (customMsg) {
                message = customMsg.replace(/{nama}/gi, customer.nama_lengkap || 'Kak');
            }
        } catch (e) {
            // pakai default
        }

        return await this.sendMessage(customer.whatsapp, message);
    }

    /**
     * Welcome message for incoming WhatsApp chat
     * Pakai pesan custom dari WA Bridge jika ada
     */
    async sendWelcomeMessage(phoneNumber, customerName = '') {
        const name = customerName || 'Kak';
        const defaultMsg = `Halo ${name}, terima kasih sudah menghubungi Cahaya Phone! Tim kami akan segera membantu Anda.`;

        let message = defaultMsg;
        try {
            const customMsg = await this._getCustomAutoReply();
            if (customMsg) {
                message = customMsg.replace(/{nama}/gi, name);
            }
        } catch (e) {
            // pakai default
        }

        return await this.sendMessage(phoneNumber, message);
    }
}

module.exports = new WhatsAppService();
