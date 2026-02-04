// One-off script to force expire 'New' -> 'Old' for testing
const db = require('../config/database');
require('dotenv').config();

// For CI/testing you can pass hours via env var; default 24.
const hours = parseInt(process.env.STATUS_EXPIRE_HOURS || (process.argv[2] || '24'), 10);
const label = process.env.STATUS_OLD_LABEL || (process.argv[3] || 'Old');
console.log(`ℹ️ Running force_expire with hours=${hours}, label=${label}`);

async function run() {
    try {
        // Use numeric hours safely
        const h = Number.isFinite(Number(hours)) ? Number(hours) : 24;
        const sql = `UPDATE customers SET status = ? WHERE status = 'New' AND created_at < DATE_SUB(NOW(), INTERVAL ${h} HOUR)`;
        console.log(`🔧 Executing SQL: ${sql}`);
        const [result] = await db.query(sql, [label]);
        const affected = (result && (result.affectedRows || result.affectedRows === 0)) ? result.affectedRows : (result && result.changedRows) || 0;
        console.log(`🔁 Force expiry: set ${affected} customer(s) from 'New' to '${label}' (older than ${h} hours)`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Force expiry failed:', err.message || err);
        process.exit(1);
    }
}

run();