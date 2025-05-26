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
    res.json({ status: 'OK', service: 'products', time: new Date().toISOString() });
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
    res.json({
        service: 'products',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

// GET /products - получить все продукты
app.get('/products', async (req, res) => {
    try {
        const cached = cache.get('products');
        if (cached) return res.json(cached);

        const result = await pool.query('SELECT * FROM products');
        const products = result.rows.map(product => ({
            ...product,
            price: decrypt(product.price.toString())
        }));

        cache.set('products', products);
        res.json(products);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /products - создать новый продукт
app.post('/products', async (req, res) => {
    const { name, description, price } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO products (name, description, price) VALUES ($1, $2, $3) RETURNING *',
            [name, description, encrypt(price.toString())]
        );

        const product = {
            ...result.rows[0],
            price: decrypt(result.rows[0].price.toString())
        };

        cache.del('products');
        res.json(product);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

let server;
function startServer() {
    server = app.listen(PORT, () => {
        console.log(`Products Service listening on port ${PORT}`);
    });
    return server;
}

if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };
