// ============================================
// WA CLIENT - WhatsApp Web.js (Terintegrasi di Backend)
// WA Bridge = BODOH. Hanya 2 tugas:
// 1. Chat masuk → lapor ke Backend (emit event)
// 2. Disuruh kirim pesan → kirim. Titik.
// ============================================

const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const EventEmitter = require('events');

class WAClient extends EventEmitter {
    constructor() {
        super();
        this.client = null;
        this.isRestarting = false;

        this.state = {
            status: 'disconnected',
            qr: null,
            qrRaw: null,
            info: null,
            lastError: null,
            messagesSentToday: 0,
            lastResetDate: new Date().toDateString(),
            disconnectedAt: null
        };

        // Anti-ban config
        this.antiBan = {
            singleDelay: { min: 500, max: 1500 },
            broadcastDelay: { min: 8000, max: 15000 },
            dailyLimit: 200,
            warningAt: 100,
            sentCount: 0,
            lastResetDate: new Date().toDateString()
        };

        // Message queue
        this.messageQueue = [];
        this.isProcessingQueue = false;

        // Auto-reply settings (hanya untuk form, BUKAN untuk chat masuk)
        this.autoReplyMessage = process.env.AUTO_REPLY_MESSAGE ||
            'Halo {nama}, terima kasih sudah menghubungi Cahaya Phone! Tim kami akan segera membantu Anda.';
    }

    // ============================================
    // INITIALIZE
    // ============================================
    async initialize() {
        // Skip di Vercel (serverless) — hanya jalan di Railway (persistent)
        if (process.env.VERCEL || process.env.SERVERLESS) {
            console.log('[WA] Skipped — running in serverless mode');
            return;
        }

        const puppeteerConfig = {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--disable-gpu',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-site-isolation-trials'
            ]
        };

        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            puppeteerConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        }

        this.client = new Client({
            authStrategy: new LocalAuth({ dataPath: './wa-session' }),
            webVersionCache: { type: 'none' },
            puppeteer: puppeteerConfig
        });

        this._setupEventHandlers();
        await this._initializeWithRetry(3);
        this._setupMemoryProtection();
    }

    // ============================================
    // EVENT HANDLERS (WA Bridge = BODOH)
    // ============================================
    _setupEventHandlers() {
        // QR Code
        this.client.on('qr', async (qr) => {
            console.log('[WA] New QR code generated');
            this.state.status = 'qr_pending';
            this.state.qrRaw = qr;
            try {
                this.state.qr = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
            } catch (err) {
                console.error('[WA] QR image failed:', err);
            }
        });

        // Authenticated
        this.client.on('authenticated', () => {
            console.log('[WA] Authenticated');
            this.state.status = 'authenticated';
            this.state.qr = null;
            this.state.qrRaw = null;
        });

        // Ready
        this.client.on('ready', async () => {
            console.log('[WA] Client ready!');
            this.state.status = 'ready';
            this.state.qr = null;
            this.state.qrRaw = null;
            this.state.lastError = null;

            try {
                const info = this.client.info;
                this.state.info = {
                    phone: info.wid.user,
                    name: info.pushname,
                    platform: info.platform
                };
                console.log(`[WA] Connected as: ${info.pushname} (${info.wid.user})`);
            } catch (e) {
                console.warn('[WA] Could not get client info:', e.message);
            }

        });

        // Disconnected — auto-reconnect
        this.client.on('disconnected', async (reason) => {
            console.log(`[WA] Disconnected: ${reason}`);
            this.state.status = 'disconnected';
            this.state.info = null;
            this.state.disconnectedAt = new Date().toISOString();
            this.state.lastError = `Disconnected: ${reason}`;

            if (reason !== 'LOGOUT' && !this.isRestarting) {
                console.log('[WA] Auto-reconnecting in 10 seconds...');
                setTimeout(async () => {
                    if (this.state.status === 'disconnected' && !this.isRestarting) {
                        this.isRestarting = true;
                        try {
                            await this.client.destroy().catch(() => {});
                            await this._initializeWithRetry(3);
                        } catch (err) {
                            console.error('[WA] Reconnect failed:', err.message);
                            this.state.lastError = `Reconnect failed: ${err.message}`;
                        } finally {
                            this.isRestarting = false;
                        }
                    }
                }, 10000);
            }
        });

        // Auth failure
        this.client.on('auth_failure', (msg) => {
            console.error('[WA] Auth failed:', msg);
            this.state.status = 'error';
            this.state.lastError = `Auth failed: ${msg}. Perlu scan QR ulang.`;
        });

        // ============================================
        // INCOMING MESSAGE — WA Bridge BODOH
        // Hanya LAPOR ke Backend. Tidak kirim apa-apa.
        // ============================================
        this.client.on('message', async (msg) => {
            try {
                // Abaikan group, status, broadcast, pesan sendiri
                if (msg.isGroupMsg || msg.from.endsWith('@g.us') || msg.isStatus || msg.fromMe || msg.from === 'status@broadcast') return;

                const phone = msg.from.replace('@c.us', '');
                const text = msg.body;
                let senderName = '';
                try {
                    const contact = await msg.getContact();
                    senderName = contact.pushname || contact.name || '';
                } catch (e) {
                    console.warn('[WA] Could not get contact info:', e.message);
                }

                console.log(`[WA MSG IN] ${senderName} (${phone}): ${text.substring(0, 50)}...`);

                // LAPOR ke Backend — emit event, backend yang handle semua logika
                this.emit('message_received', {
                    sender: phone,
                    message: text,
                    pushname: senderName,
                    timestamp: msg.timestamp,
                    source: 'wa-bridge'
                });

                // TIDAK kirim auto-reply. TIDAK cek database. BODOH. Titik.
            } catch (err) {
                console.error('[WA] Error processing message:', err.message);
            }
        });
    }

    // ============================================
    // SEND MESSAGE (disuruh Backend → kirim. Titik.)
    // ============================================
    async sendMessage(phone, message, isBroadcast = false) {
        if (!this.client || this.state.status !== 'ready') {
            return { success: false, error: 'WhatsApp not connected. Status: ' + this.state.status };
        }

        return this._queueMessage(phone, message, isBroadcast);
    }

    // ============================================
    // INTERNAL: Message Queue (anti-spam)
    // ============================================
    _resetDailyCounter() {
        const today = new Date().toDateString();
        if (this.antiBan.lastResetDate !== today) {
            this.antiBan.sentCount = 0;
            this.antiBan.lastResetDate = today;
            this.state.messagesSentToday = 0;
            this.state.lastResetDate = today;
        }
    }

    _canSend() {
        this._resetDailyCounter();
        return this.antiBan.sentCount < this.antiBan.dailyLimit;
    }

    _randomDelay(min, max) {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    _queueMessage(phone, message, isBroadcast) {
        return new Promise((resolve) => {
            this.messageQueue.push({ phone, message, isBroadcast, resolve });
            this._processQueue();
        });
    }

    async _processQueue() {
        if (this.isProcessingQueue) return;
        this.isProcessingQueue = true;

        while (this.messageQueue.length > 0) {
            const task = this.messageQueue.shift();

            if (!this._canSend()) {
                task.resolve({
                    success: false,
                    error: `Daily limit reached (${this.antiBan.dailyLimit} messages). Coba lagi besok.`
                });
                continue;
            }

            try {
                const delay = task.isBroadcast ? this.antiBan.broadcastDelay : this.antiBan.singleDelay;
                await this._randomDelay(delay.min, delay.max);

                const chatId = task.phone.includes('@c.us') ? task.phone : `${task.phone}@c.us`;

                // Cek dulu apakah nomor terdaftar di WhatsApp
                const numberId = await this.client.getNumberId(task.phone).catch(() => null);
                if (!numberId) {
                    throw new Error(`Nomor ${task.phone} tidak terdaftar di WhatsApp`);
                }

                // Kirim pakai ID yang sudah diverifikasi
                const verifiedChatId = numberId._serialized;
                await this.client.sendMessage(verifiedChatId, task.message);

                this.antiBan.sentCount++;
                this.state.messagesSentToday = this.antiBan.sentCount;

                console.log(`[WA SENT] ${task.phone} (${this.antiBan.sentCount}/${this.antiBan.dailyLimit} today)`);
                task.resolve({ success: true, phone: task.phone });
            } catch (error) {
                console.error(`[WA FAIL] ${task.phone}:`, error.message);
                task.resolve({ success: false, phone: task.phone, error: error.message });
            }
        }

        this.isProcessingQueue = false;
    }

    // ============================================
    // ADMIN CONTROL APIs
    // ============================================
    getStatus() {
        this._resetDailyCounter();
        return {
            success: true,
            status: this.state.status,
            qr: this.state.qr,
            info: this.state.info,
            messagesSentToday: this.state.messagesSentToday,
            dailyLimit: this.antiBan.dailyLimit,
            lastError: this.state.lastError
        };
    }

    getStats() {
        this._resetDailyCounter();
        return {
            success: true,
            sentToday: this.antiBan.sentCount,
            dailyLimit: this.antiBan.dailyLimit,
            remaining: this.antiBan.dailyLimit - this.antiBan.sentCount,
            queueLength: this.messageQueue.length
        };
    }

    setDailyLimit(limit) {
        if (limit && Number.isInteger(limit) && limit > 0) {
            this.antiBan.dailyLimit = limit;
        }
        return { success: true, dailyLimit: this.antiBan.dailyLimit, sentToday: this.antiBan.sentCount };
    }

    async disconnect() {
        if (!this.client) return { success: false, error: 'Client not initialized' };
        try {
            await this.client.logout();
            this.state.status = 'disconnected';
            this.state.info = null;
            this.state.qr = null;
            return { success: true, message: 'WhatsApp disconnected' };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    async restart() {
        if (this.isRestarting) {
            return { success: true, message: 'Already restarting. Check status for QR.' };
        }
        this.isRestarting = true;

        try {
            this.state.status = 'disconnected';
            this.state.qr = null;
            this.state.info = null;

            await this.client.destroy().catch(() => {});
            console.log('[WA] Reinitializing...');

            // Init in background
            this._initializeWithRetry(3).then(() => {
                this.isRestarting = false;
            }).catch(() => {
                this.isRestarting = false;
            });

            return { success: true, message: 'WhatsApp restarting. Check status for QR.' };
        } catch (err) {
            this.isRestarting = false;
            return { success: false, error: err.message };
        }
    }

    // ============================================
    // INTERNAL: Init with retry
    // ============================================
    async _initializeWithRetry(maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[WA] Starting client (attempt ${attempt}/${maxRetries})...`);
                await this.client.initialize();
                console.log('[WA] Client initialized');
                return;
            } catch (err) {
                console.error(`[WA] Attempt ${attempt} failed:`, err.message);
                this.state.lastError = err.message;

                if (attempt < maxRetries) {
                    const wait = attempt * 5;
                    console.log(`[WA] Retrying in ${wait}s...`);
                    await new Promise(r => setTimeout(r, wait * 1000));
                } else {
                    console.error('[WA] All attempts failed.');
                    this.state.status = 'error';
                }
            }
        }
    }

    // ============================================
    // MEMORY PROTECTION
    // ============================================
    _setupMemoryProtection() {
        // Auto-restart Chromium setiap 6 jam
        setInterval(async () => {
            const ramMB = Math.round(process.memoryUsage().rss / 1024 / 1024);
            console.log(`[WA MEM] RAM: ${ramMB} MB`);

            if (ramMB > 400 && this.state.status === 'ready') {
                console.log('[WA MEM] High RAM, restarting...');
                try {
                    await this.client.destroy().catch(() => {});
                    await this.client.initialize();
                    console.log('[WA MEM] Reinitialized');
                } catch (err) {
                    console.error('[WA MEM] Restart failed:', err.message);
                }
            }
        }, 6 * 60 * 60 * 1000);

        // RAM monitor setiap 5 menit
        setInterval(() => {
            const ramMB = Math.round(process.memoryUsage().rss / 1024 / 1024);
            console.log(`[WA MON] RAM: ${ramMB} MB | Sent: ${this.antiBan.sentCount}/${this.antiBan.dailyLimit} | Queue: ${this.messageQueue.length}`);
        }, 5 * 60 * 1000);
    }
}

// Singleton instance
const waClient = new WAClient();
module.exports = waClient;
