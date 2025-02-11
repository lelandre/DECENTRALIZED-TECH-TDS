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

app.post('/orders', (req, res) => {
    let { userId, products } = req.body;
    let sql = 'INSERT INTO orders (userId, products) VALUES (?, ?)';
    db.query(sql, [userId, JSON.stringify(products)], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ orderId: result.insertId, userId, products });
    });
});

app.get('/orders/:userId', (req, res) => {
    let sql = 'SELECT * FROM orders WHERE userId = ?';
    db.query(sql, [req.params.userId], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        // Convertir les produits en objets JavaScript
        const orders = results.map(order => {
            const products = JSON.parse(order.products);
            return {
                ...order,
                products
            };
        });

        // Calcul du prix total
        const fetchProductPrices = orders.map(order => {
            return new Promise((resolve, reject) => {
                let productIds = order.products.map(p => p.productId);
                let sql = `SELECT id, price FROM products WHERE id IN (${productIds.join(",")})`;

                db.query(sql, (err, productResults) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    let total_price = order.products.reduce((total, product) => {
                        let productData = productResults.find(p => p.id === product.productId);
                        return total + (productData ? productData.price * product.quantity : 0);
                    }, 0);

                    resolve({ ...order, total_price });
                });
            });
        });

        Promise.all(fetchProductPrices)
            .then(ordersWithTotal => res.json(ordersWithTotal))
            .catch(err => res.status(500).json({ error: err.message }));
    });
});
