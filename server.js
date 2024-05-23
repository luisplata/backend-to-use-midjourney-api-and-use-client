import express from 'express';
import fs from 'fs';
import { Midjourney } from './dist/midjourney.js';
import cors from 'cors';
import winston from 'winston';
import dotenv from 'dotenv';
import path from 'path';
import timeout from 'connect-timeout';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
    Client,
    Events,
    GatewayIntentBits
} from "discord.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, 'client')));


//security
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

//timeout
app.use(timeout('120s'));

const client = new Midjourney({
    ServerId: process.env.SERVER_ID,
    ChannelId: process.env.CHANNEL_ID,
    SalaiToken: process.env.SALAI_TOKEN,
    Debug: true,
    Ws: true,
});

//Bot Discord
const bot = new Client({ intents: [GatewayIntentBits.Guilds] });

bot.once(Events.ClientReady, async readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    const textImage = fs.readFileSync('client/images/boy-bot.txt', 'utf8');
    SendPictureToDiscord(process.env.CHANNEL_ID_FACE, textImage,
        link => {
            // bot.user.setAvatar(link).then(() => {
            //     console.log('Avatar set!');
            // }).catch((error) => {
            //     console.error(error);
            // });
        }, error => {
            console.error(error);
        });
    bot.channels.cache.get(process.env.CHANNEL_ID_FACE).send('Bot is ready');
});

async function SendPictureToDiscord(channelId, imageBase64, ok, error) {
    const base64String = imageBase64;
    const buffer = Buffer.from(base64String, 'base64');
    bot.channels.cache.get(channelId).send({
        files: [buffer]
    }).then((message) => {
        ok(message.attachments.first().url);
    }).catch((err) => {
        console.error(err);
        error(err);
    });
}

bot.login(process.env.DISCORD_TOKEN);

app.get('/', haltOnTimedout, (req, res) => {
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

function haltOnTimedout(req, res, next) {
    if (!req.timedout) next();
}

app.post('/api/info', haltOnTimedout, verifyToken, async (req, res) => {
    await client.init();
    const info = await client.Info();
    res.json(info);
});

app.post('/api/imagine', haltOnTimedout, verifyToken, async (req, res) => {
    try {
        await client.init();
        let promptOriginal = req.body.prompt;
        let prompt = promptOriginal;
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
        res.json({ message: 'Imagine', result: Imagine.proxy_url, upscale: upscales, prompt: promptOriginal });

    } catch (error) {
        console.error(error.message);
        generalLogger.error(error.message);
        res.status(500).json({ error: error.message });
    }
    finally {
        client.Close();
    }
});

app.post('/api/get-token', haltOnTimedout, async (req, res) => {
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

app.post('/api/face-swap', haltOnTimedout, verifyToken, async (req, res) => {
    try {
        specificLogger.info(`/api/face-swap: <${req.user.token}> New FaceSwap ${FaceSwap.proxy_url}`);
        const base64String = req.body.image;
        SendPictureToDiscord(process.env.CHANNEL_ID, base64String,
            async link => {
                let source = "https://cdn.midjourney.com/u/e4691495-b9cc-4630-b4bd-e6357490aa28/d81a34547c92963bb3865f364d2f3487b3c60c623b1e62fe3f67cabd1b49995a.webp";
                // const info = await client.FaceSwap(link, source);

                // console.log(info?.uri);
                // bot.user.setAvatar(link).then(() => {
                //     console.log('Avatar set!');
                // }).catch((error) => {
                //     console.error(error);
                // });
            }, error => {
                console.error(error);
            });

        res.json({ message: 'FaceSwap', result: FaceSwap.proxy_url });
    } catch (error) {
        console.error(error.message);
        generalLogger.error(error.message);
        res.status(500).json({ error: error.message });
    }
    finally {
        client.Close();
    }
});


app.listen(port, () => {
    generalLogger.info(`Servidor corriendo en http://localhost:${port}`);
});