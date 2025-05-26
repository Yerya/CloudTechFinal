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
        const result = await pool.query('SELECT * FROM public.orders');
        res.json(result.rows);
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
            [customer_name, product_name, quantity, total_price]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Orders Service listening on port ${PORT}`);
});

module.exports = app;
