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
    res.json({ status: 'OK', service: 'orders', time: new Date().toISOString() });
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
    res.json({
        service: 'orders',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

// GET /orders - получить все заказы
app.get('/orders', async (req, res) => {
    try {
        const cached = cache.get('orders');
        if (cached) return res.json(cached);

        const result = await pool.query('SELECT * FROM orders');
        const orders = result.rows.map(order => ({
            ...order,
            customer_name: decrypt(order.customer_name),
            total_price: decrypt(order.total_price.toString())
        }));

        cache.set('orders', orders);
        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /orders - создать новый заказ
app.post('/orders', async (req, res) => {
    const { customer_name, product_name, quantity, total_price } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO orders (customer_name, product_name, quantity, total_price) VALUES ($1, $2, $3, $4) RETURNING *',
            [encrypt(customer_name), product_name, quantity, encrypt(total_price.toString())]
        );

        const order = {
            ...result.rows[0],
            customer_name: decrypt(result.rows[0].customer_name),
            total_price: decrypt(result.rows[0].total_price.toString())
        };

        cache.del('orders');
        res.json(order);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

let server;
function startServer() {
    server = app.listen(PORT, () => {
        console.log(`Orders Service listening on port ${PORT}`);
    });
    return server;
}

if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };
