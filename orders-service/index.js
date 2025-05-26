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
            customer_name: order.customer_name ? decrypt(order.customer_name) : null,
            total_price: order.total_price ? decrypt(order.total_price.toString()) : null
        }));

        cache.set('orders', orders);
        res.json(orders);
    } catch (err) {
        console.error('Error in GET /orders:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// POST /orders - создать новый заказ
app.post('/orders', async (req, res) => {
    const { customer_name, product_name, quantity, total_price } = req.body;
    
    // Validate required fields
    if (!product_name || product_name.trim() === '') {
        return res.status(400).json({ error: 'Product name is required' });
    }
    if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
        return res.status(400).json({ error: 'Valid quantity is required' });
    }

    try {
        // Convert values safely
        const customerNameString = customer_name ? customer_name.toString() : null;
        const totalPriceString = total_price != null ? total_price.toString() : null;
        
        const result = await pool.query(
            'INSERT INTO orders (customer_name, product_name, quantity, total_price) VALUES ($1, $2, $3, $4) RETURNING *',
            [
                customerNameString ? encrypt(customerNameString) : null,
                product_name,
                quantity,
                totalPriceString ? encrypt(totalPriceString) : null
            ]
        );

        const order = {
            ...result.rows[0],
            customer_name: result.rows[0].customer_name ? decrypt(result.rows[0].customer_name) : null,
            total_price: result.rows[0].total_price ? decrypt(result.rows[0].total_price.toString()) : null
        };

        cache.del('orders');
        res.json(order);
    } catch (err) {
        console.error('Error in POST /orders:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
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
