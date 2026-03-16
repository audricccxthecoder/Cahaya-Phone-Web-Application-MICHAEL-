// ============================================
// WHATSAPP SERVICE
// With rate limiting & queue (no Redis needed)
// ============================================

const axios = require('axios');
const { sanitizePhone } = require('../utils/phoneUtils');
require('dotenv').config();

// ============================================
// SIMPLE IN-MEMORY QUEUE
// ============================================

class MessageQueue {
    constructor() {
        this.queue = [];
        this.running = false;
        this.stopRequested = false;
        this.paused = false;
        this.log = [];          // delivery log per broadcast session
        this.total = 0;
        this.sent = 0;
        this.failed = 0;
    }

    // Add job to queue
    add(job) {
        this.queue.push(job);
        if (!this.running) this._run();
    }

    // Stop broadcast
    stop() {
        this.stopRequested = true;
        this.paused = false;
    }

    // Pause broadcast
    pause() {
        this.paused = true;
    }

    // Resume broadcast
    resume() {
        this.paused = false;
    }

    // Get current broadcast status
    status() {
        return {
            running: this.running,
            paused: this.paused,
            queued: this.queue.length,
            total: this.total,
            sent: this.sent,
            failed: this.failed,
            log: this.log.slice(-50) // last 50 entries
        };
    }

    // Reset for new broadcast session
    reset(total) {
        this.queue = [];
        this.stopRequested = false;
        this.paused = false;
        this.log = [];
        this.total = total;
        this.sent = 0;
        this.failed = 0;
    }

    async _run() {
        this.running = true;
        while (this.queue.length > 0 && !this.stopRequested) {
            // Wait while paused
            while (this.paused && !this.stopRequested) {
                await _sleep(500);
            }
            if (this.stopRequested) break;

            const job = this.queue.shift();
            const result = await job();

            if (result.success) {
                this.sent++;
            } else {
                this.failed++;
            }
            this.log.push(result);

            // Random delay 3–6 seconds between messages (reduce spam detection)
            if (this.queue.length > 0 && !this.stopRequested) {
                const delay = 3000 + Math.random() * 3000;
                await _sleep(delay);
            }
        }
        this.running = false;
        if (this.stopRequested) {
            this.log.push({ info: 'Broadcast stopped by admin' });
        }
    }
}

function _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Global queue instance (shared across requests)
const broadcastQueue = new MessageQueue();


// ============================================
// WHATSAPP SERVICE
// ============================================

class WhatsAppService {
    constructor() {
        this.apiUrl = process.env.WHATSAPP_API_URL;
        this.apiKey = process.env.WHATSAPP_API_KEY;
        // Simple rate limiter: track last send time
        this._lastSent = 0;
        this._minInterval = 1000; // min 1 second between any messages
    }

    /**
     * Send a single WhatsApp message
     * @param {string} phoneNumber - Raw or normalized phone number
     * @param {string} message
     */
    async sendMessage(phoneNumber, message) {
        try {
            const formattedNumber = sanitizePhone(phoneNumber);

            if (!formattedNumber || !formattedNumber.startsWith('62')) {
                return { success: false, error: 'Invalid phone number', phone: phoneNumber };
            }

            // Simple rate limiting: wait if last send was too recent
            const now = Date.now();
            const elapsed = now - this._lastSent;
            if (elapsed < this._minInterval) {
                await _sleep(this._minInterval - elapsed);
            }
            this._lastSent = Date.now();

            console.log(`📤 Sending WhatsApp to: ${formattedNumber}`);

            if (!this.apiUrl || !this.apiKey) {
                console.warn('⚠️ WhatsApp API not configured (WHATSAPP_API_URL / WHATSAPP_API_KEY missing)');
                return { success: false, error: 'WhatsApp API not configured', phone: formattedNumber };
            }

            const response = await axios.post(this.apiUrl, {
                target: formattedNumber,
                message: message,
                countryCode: '62'
            }, {
                headers: {
                    'Authorization': this.apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            console.log(`✅ WhatsApp sent to ${formattedNumber}`);
            return { success: true, phone: formattedNumber, data: response.data };

        } catch (error) {
            console.error(`❌ WhatsApp send failed to ${phoneNumber}:`, error.message);
            return {
                success: false,
                phone: phoneNumber,
                error: error.message,
                details: error.response?.data
            };
        }
    }

    /**
     * Auto-reply after customer submits form
     */
    async sendAutoReply(customer) {
        const message = `Halo ${customer.nama_lengkap}, terima kasih sudah mengunjungi toko kami! ` +
            `Kami akan mengirimkan promo dan ucapan spesial untuk Anda. ` +
            `Tim kami akan segera menghubungi Anda.`;
        return await this.sendMessage(customer.whatsapp, message);
    }

    /**
     * Welcome message for WhatsApp webhook (customer dari Instagram/sosmed)
     */
    async sendWelcomeMessage(phoneNumber, customerName = '') {
        const name = customerName || 'Kak';
        const message = `Halo ${name}, terima kasih sudah menghubungi Cahaya Phone! ` +
            `Tim kami akan segera membantu Anda.`;
        return await this.sendMessage(phoneNumber, message);
    }

    /**
     * Start a broadcast to a list of customers (safe mode)
     * @param {Array} customers - Array of { id, nama_lengkap, whatsapp }
     * @param {string} messageTemplate - Message to send (use {nama} as placeholder)
     * @param {Function} onLog - Callback to log delivery to DB
     */
    startBroadcast(customers, messageTemplate, onLog) {
        broadcastQueue.reset(customers.length);

        for (const customer of customers) {
            broadcastQueue.add(async () => {
                const phone = sanitizePhone(customer.whatsapp);
                const message = messageTemplate.replace(/{nama}/gi, customer.nama_lengkap || 'Kak');
                const result = await this.sendMessage(phone, message);

                // Log ke database via callback
                if (onLog) {
                    await onLog(customer.id, message, result.success ? 'sent' : 'failed').catch(() => {});
                }

                return {
                    ...result,
                    customer_id: customer.id,
                    name: customer.nama_lengkap
                };
            });
        }

        return broadcastQueue.status();
    }

    getBroadcastStatus() {
        return broadcastQueue.status();
    }

    stopBroadcast() {
        broadcastQueue.stop();
        return broadcastQueue.status();
    }

    pauseBroadcast() {
        broadcastQueue.pause();
        return broadcastQueue.status();
    }

    resumeBroadcast() {
        broadcastQueue.resume();
        return broadcastQueue.status();
    }
}

module.exports = new WhatsAppService();
