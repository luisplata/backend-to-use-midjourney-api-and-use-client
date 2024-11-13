const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const timeout = require('connect-timeout');
const cors = require('cors');
const authRoutes = require('./routes/auth.js');
const apiRoutes = require('./routes/api.js');
const { initializeDiscordBot } = require('./discord/bot.js');

// el resto de tu código

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'client')));
app.use(express.json({ limit: '50mb' }));
app.use(timeout('120s'));

// Initialize Discord Bot
initializeDiscordBot();

// Routes
app.use('/api', apiRoutes);
app.use('/auth', authRoutes);

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    if (err.timeout) {
        res.status(503).send('Request timed out');
    } else {
        res.status(500).send('Internal Server Error');
    }
});

// Start server
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
