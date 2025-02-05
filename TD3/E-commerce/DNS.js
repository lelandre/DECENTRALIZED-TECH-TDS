const express = require('express');
const app = express();
const PORT = 3000;

//URL du serveur Flask
const serverUrl = `localhost:${PORT}`;

app.get('/getServer', (req, res) => {
    res.json({ code: 200, server: serverUrl });
});

app.listen(PORT, () => {
    console.log(`DNS Registry running on http://localhost:${PORT}`);
});