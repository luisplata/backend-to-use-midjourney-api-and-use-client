import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import timeout from 'connect-timeout';
import cors from 'cors';
import { configureLogging } from './utils/logger.js';
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/api.js';
import { initializeDiscordBot } from './discord/bot.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'client')));
app.use(express.json({ limit: '50mb' }));
app.use(timeout('120s'));

// Configure loggers
configureLogging();

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
