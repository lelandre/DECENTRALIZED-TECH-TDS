const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

const FLASK_PORT = 5000;
const serverUrl = `http://localhost:${FLASK_PORT}`;

app.use(express.json());
app.use(cors());

// Import des routes API
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const cartRoutes = require('./routes/cart');

app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/cart', cartRoutes);

// Route pour récupérer l'URL du serveur Flask
app.get('/getServer', (req, res) => {
    res.json({ code: 200, server: serverUrl });
});

// Servir le front-end
app.use(express.static(path.join(__dirname, 'frontend')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Lancer le serveur
app.listen(PORT, () => {
    console.log(`DNS Registry et API running sur http://localhost:${PORT}`);
});
