const express = require('express');
const pool = require('./db');
const { encrypt, decrypt } = require('./crypto');
const cache = require('./cache');
const app = express();
const PORT = 5000;
const fs = require('fs');
const logStream = fs.createWriteStream('logs.txt', { flags: 'a' });

app.use((req, res, next) => {
    logStream.write(`${new Date().toISOString()} ${req.method} ${req.url}\n`);
    next();
});

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'payments', time: new Date().toISOString() });
});

app.get('/metrics', (req, res) => {
    res.json({
        service: 'payments',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

app.get('/payments', async (req, res) => {
    try {
        const cached = cache.get('payments');
        if (cached) return res.json(cached);

        const result = await pool.query('SELECT * FROM payments');
        const payments = result.rows.map(payment => ({
            ...payment,
            amount: payment.amount ? decrypt(payment.amount.toString()) : null
        }));

        cache.set('payments', payments);
        res.json(payments);
    } catch (err) {
        console.error('Error in GET /payments:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

app.post('/payments', async (req, res) => {
    const { order_id, amount, payment_date } = req.body;

    if (!order_id || typeof order_id !== 'number' || order_id <= 0) {
        return res.status(400).json({ error: 'Valid order_id is required' });
    }
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
        return res.status(400).json({ error: 'Valid amount is required' });
    }

    try {
        const encryptedAmount = encrypt(amount.toString());
        const result = await pool.query(
            'INSERT INTO payments (order_id, amount, payment_date) VALUES ($1, $2, $3) RETURNING *',
            [order_id, encryptedAmount, payment_date || new Date()]
        );

        const payment = {
            ...result.rows[0],
            amount: decrypt(result.rows[0].amount.toString())
        };

        cache.del('payments');
        res.json(payment);
    } catch (err) {
        console.error('Error in POST /payments:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

let server;
function startServer() {
    server = app.listen(PORT, () => {
        console.log(`Payments Service listening on port ${PORT}`);
    });
    return server;
}

if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };
