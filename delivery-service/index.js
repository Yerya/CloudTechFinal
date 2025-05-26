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
    res.json({ status: 'OK', service: 'delivery', time: new Date().toISOString() });
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
    res.json({
        service: 'delivery',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

// GET /delivery - получить все доставки
app.get('/delivery', async (req, res) => {
    try {
        const cached = cache.get('deliveries');
        if (cached) return res.json(cached);

        const result = await pool.query('SELECT * FROM deliveries');
        const deliveries = result.rows.map(delivery => ({
            ...delivery,
            address: decrypt(delivery.address)
        }));

        cache.set('deliveries', deliveries);
        res.json(deliveries);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /delivery - создать новую доставку
app.post('/delivery', async (req, res) => {
    const { order_id, address, status } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO deliveries (order_id, address, status) VALUES ($1, $2, $3) RETURNING *',
            [order_id, encrypt(address), status]
        );

        const delivery = {
            ...result.rows[0],
            address: decrypt(result.rows[0].address)
        };

        cache.del('deliveries');
        res.json(delivery);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

let server;
function startServer() {
    server = app.listen(PORT, () => {
        console.log(`Delivery Service listening on port ${PORT}`);
    });
    return server;
}

if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };
