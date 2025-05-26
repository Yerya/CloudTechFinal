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

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'payments', time: new Date().toISOString() });
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
    res.json({
        service: 'payments',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

// GET /payments - получить все платежи
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

// POST /payments - создать новый платеж
app.post('/payments', async (req, res) => {
    const { order_id, amount, payment_date } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO payments (order_id, amount, payment_date) VALUES ($1, $2, $3) RETURNING *',
            [order_id, amount ? encrypt(amount.toString()) : null, payment_date]
        );

        const payment = {
            ...result.rows[0],
            amount: result.rows[0].amount ? decrypt(result.rows[0].amount.toString()) : null
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
