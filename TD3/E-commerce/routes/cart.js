const express = require('express');
const mysql = require('mysql2');
const app = express();
const PORT = 3000;

app.use(express.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Ordinateur1#',
    database: 'ecommerce'
});

app.post('/cart/:userId', (req, res) => {
    let { productId, quantity } = req.body;
    let sql = 'INSERT INTO cart (userId, productId, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?';
    db.query(sql, [req.params.userId, productId, quantity, quantity], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Product added to cart' });
    });
});

app.get('/cart/:userId', (req, res) => {
    let sql = 'SELECT * FROM cart WHERE userId = ?';
    db.query(sql, [req.params.userId], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(results);
    });
});

app.delete('/cart/:userId/item/:productId', (req, res) => {
    let sql = 'DELETE FROM cart WHERE userId = ? AND productId = ?';
    db.query(sql, [req.params.userId, req.params.productId], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Product removed from cart' });
    });
});