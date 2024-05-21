const express = require('express');
const { Midjourney } = require('midjourney');
const cors = require('cors');
const app = express();
const port = 3000;
const winston = require('winston');
require('dotenv/config');
app.use(express.json());
app.use(cors());
const path = require('path');
app.use(express.static(path.join(__dirname, 'client')));

//security
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const myPlaintextPassword = process.env.JWT_PASS;
const saltRounds = 10;

let hashedPassword = '';
bcrypt.hash(myPlaintextPassword, saltRounds, function (err, hash) {
    hashedPassword = hash;
});

//logs
const generalLogger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'general.log' })
    ]
});

const specificLogger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'specific.log' })
    ]
});

const client = new Midjourney({
    ServerId: process.env.SERVER_ID,
    ChannelId: process.env.CHANNEL_ID,
    SalaiToken: process.env.SALAI_TOKEN,
    Debug: true,
    Ws: true,
});

app.get('/', (req, res) => {
    generalLogger.info('GET /');
    res.sendFile(path.join(__dirname, 'client/index.html'));
});

function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const uri = req.originalUrl;
    if (token == null) {
        return res.sendStatus(401);
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.sendStatus(403);
        }
        user.token = token;
        req.user = user;
        specificLogger.info(`verifyToken: <${token}> user ${JSON.stringify(user)} wants to access the app at ${uri}`);
        next();
    });
}

app.post('/api/info', verifyToken, async (req, res) => {
    await client.init();
    const info = await client.Info();
    res.json(info);
});

app.post('/api/imagine', verifyToken, async (req, res) => {
    await client.init();
    try {
        let promptOriginal = req.body.prompt;
        let prompt = encodeURIComponent(promptOriginal);
        specificLogger.info(`/api/imagine: <${req.user.token}> New prompt ${prompt}`);
        const Imagine = await client.Imagine(
            prompt,
            (uri, progress) => {
                generalLogger.info("loading", uri, "progress", progress);
            }
        );
        generalLogger.info(Imagine);
        specificLogger.info(`/api/imagine: <${req.user.token}> New Imagine ${Imagine.proxy_url}`);
        if (!Imagine) {
            generalLogger.info("no message");
            return res.json({ message: 'No message' });
        }
        upscales = [];
        for (let i = 1; i <= 4; i++) {
            const label = `U${i}`;
            const customID = Imagine.options?.find((o) => o.label === label)?.custom;
            if (!customID) {
                upscales.push({ message: `No ${label}` });
                continue;
            }
            const Upscale = await client.Custom({
                msgId: Imagine.id,
                flags: Imagine.flags,
                customId: customID,
                loading: (uri, progress) => {
                    generalLogger.info("loading", uri, "progress", progress);
                },
            });
            if (!Upscale) {
                generalLogger.info("no Upscale");
                upscales.push({ message: 'No Upscale' });
                continue;
            }
            specificLogger.info(`/api/imagine Upscale: <${req.user.token}> New Upscale ${Upscale.proxy_url}`);
            upscales.push(Upscale.proxy_url);
        }
        client.Close();
        res.json({ message: 'Imagine', result: Imagine.proxy_url, upscale: upscales, prompt: promptOriginal });

    } catch (error) {
        client.Close();
        console.error(error.message);
        generalLogger.error(error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/get-token', async (req, res) => {
    const password = req.body.password;
    try {
        const match = await bcrypt.compare(password, hashedPassword);

        if (match) {
            const apiToken = jwt.sign({ user: 'user' }, process.env.JWT_SECRET, { expiresIn: '1h' });
            specificLogger.info(`/api/get-token: New user connected ${apiToken}`);
            res.json({ token: apiToken });
        } else {
            res.status(403).json({ error: 'Invalid password; use `?password=[password]` to can use the app' });
        }
    } catch (error) {
        generalLogger.error(error);
        res.status(403).json({ error: 'Invalid password; use `?password=[password]` to can use the app' });
    }
});

app.listen(port, () => {
    generalLogger.info(`Servidor corriendo en http://localhost:${port}`);
});