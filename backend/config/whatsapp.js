// ============================================
// WHATSAPP SERVICE
// Service untuk mengirim pesan WhatsApp
// ============================================

const axios = require('axios');
require('dotenv').config();

class WhatsAppService {
    constructor() {
        this.apiUrl = process.env.WHATSAPP_API_URL;
        this.apiKey = process.env.WHATSAPP_API_KEY;
    }

    /**
     * Kirim pesan WhatsApp
     * @param {string} phoneNumber - Nomor WhatsApp tujuan (format: 628xxx)
     * @param {string} message - Pesan yang akan dikirim
     * @returns {Promise<object>} Response dari API
     */
    async sendMessage(phoneNumber, message) {
        try {
            // Validasi nomor (hapus karakter non-digit)
            const cleanNumber = phoneNumber.replace(/\D/g, '');
            
            // Format nomor ke 628xxx jika dimulai dengan 08
            const formattedNumber = cleanNumber.startsWith('0') 
                ? '62' + cleanNumber.substring(1)
                : cleanNumber;

            console.log(`📤 Sending WhatsApp to: ${formattedNumber}`);
            console.log(`📝 Message: ${message}`);

            // Payload untuk Fonnte
            const payload = {
                target: formattedNumber,
                message: message,
                countryCode: '62'
            };

            // Kirim request ke WhatsApp API
            const response = await axios.post(this.apiUrl, payload, {
                headers: {
                    'Authorization': this.apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 10000 // 10 detik timeout
            });

            console.log('✅ WhatsApp sent successfully');
            return {
                success: true,
                data: response.data
            };

        } catch (error) {
            console.error('❌ WhatsApp send failed:', error.message);
            
            // Return error tapi tidak gagal total
            return {
                success: false,
                error: error.message,
                details: error.response?.data
            };
        }
    }

    /**
     * Kirim pesan auto-reply setelah customer submit form
     * @param {object} customer - Data customer
     * @returns {Promise<object>}
     */
    async sendAutoReply(customer) {
        const message = this.generateAutoReplyMessage(customer);
        return await this.sendMessage(customer.whatsapp, message);
    }

    /**
     * Generate template pesan auto-reply
     * @param {object} customer - Data customer
     * @returns {string} Message template
     */
    generateAutoReplyMessage(customer) {
        const salesName = customer.nama_sales || 'kami';
        
        return `Halo ${customer.nama_lengkap}, terima kasih sudah menghubungi Cahaya Phone. Tim sales ${salesName} akan segera menghubungi Anda.`;
    }

    /**
     * Kirim pesan welcome untuk customer dari Instagram
     * @param {string} phoneNumber - Nomor WhatsApp
     * @param {string} customerName - Nama customer
     * @returns {Promise<object>}
     */
    async sendWelcomeMessage(phoneNumber, customerName = '') {
        const name = customerName || 'Kak';
        const message = `Halo ${name}, terima kasih sudah menghubungi Cahaya Phone. Tim kami akan segera menghubungi Anda.`;
        
        return await this.sendMessage(phoneNumber, message);
    }
}

module.exports = new WhatsAppService();