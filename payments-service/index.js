const express = require('express');
const pool = require('./db');
const app = express();
const PORT = 5000;

app.use(express.json());

app.get('/payments', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM payments');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

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


app.listen(PORT, () => {
    console.log(`Payments Service listening on port ${PORT}`);
});
