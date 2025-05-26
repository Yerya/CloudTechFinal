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
        const cached = cache.get('delivery');
        if (cached) return res.json(cached);

        const result = await pool.query('SELECT * FROM delivery');
        const deliveries = result.rows.map(delivery => ({
            ...delivery,
            address: delivery.address ? decrypt(delivery.address) : null
        }));

        cache.set('delivery', deliveries);
        res.json(deliveries);
    } catch (err) {
        console.error('Error in GET /delivery:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// POST /delivery - создать новую доставку
app.post('/delivery', async (req, res) => {
    const { order_id, address, delivery_date } = req.body;
    
    // Validate required fields
    if (!order_id || typeof order_id !== 'number' || order_id <= 0) {
        return res.status(400).json({ error: 'Valid order_id is required' });
    }
    if (!address || address.trim() === '') {
        return res.status(400).json({ error: 'Address is required' });
    }

    try {
        // Convert address to string safely
        const addressString = address.toString();
        
        const result = await pool.query(
            'INSERT INTO delivery (order_id, address, delivery_date) VALUES ($1, $2, $3) RETURNING *',
            [order_id, encrypt(addressString), delivery_date || new Date()]
        );

        const delivery = {
            ...result.rows[0],
            address: result.rows[0].address ? decrypt(result.rows[0].address) : null
        };

        cache.del('delivery');
        res.json(delivery);
    } catch (err) {
        console.error('Error in POST /delivery:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
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
