const express = require('express');
const pool = require('./db');
const app = express();
const PORT = 5000;
const fs = require('fs');
const logStream = fs.createWriteStream('logs.txt', { flags: 'a' });

app.use((req, res, next) => {
    const logEntry = `${new Date().toISOString()} ${req.method} ${req.url}\n`;
    logStream.write(logEntry);
    console.log(logEntry);
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
        const result = await pool.query('SELECT * FROM payments');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// POST /payments - создать новый платеж
app.post('/payments', async (req, res) => {
    const { order_id, amount, payment_date } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO payments (order_id, amount, payment_date) VALUES ($1, $2, $3) RETURNING *',
            [order_id, amount, payment_date]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
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
