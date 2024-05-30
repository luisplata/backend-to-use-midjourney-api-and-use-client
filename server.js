import express from 'express';
import fs from 'fs';
import { Midjourney } from 'midjourney';
import cors from 'cors';
import winston from 'winston';
import dotenv from 'dotenv';
import path from 'path';
import timeout from 'connect-timeout';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import {
    Client as DiscordClient,
    Events,
    GatewayIntentBits
    } from "discord.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

app.use(cors());

app.use(express.static(path.join(__dirname, 'client')));
app.use(express.json({ limit: '50mb' }));


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
const bot = new DiscordClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

bot.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        await interaction.reply({ content: 'Secret Pong!', ephemeral: false });
    }
});

bot.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${bot.user.tag}`);
    const textImage = fs.readFileSync('client/images/boy-bot.txt', 'utf8');
    const buffer = Buffer.from(textImage, 'base64');
    //const url = await SendPictureToDiscord(process.env.CHANNEL_ID_FACE, textImage);
    bot.channels.cache.get(process.env.CHANNEL_ID_FACE).send("Boy Bot Ready!");


    //RetrieveMessages(50, process.env.SALAI_TOKEN, process.env.CHANNEL_ID, "https://discord.com").then((data) => {console.log(data);});
    //bot.channels.cache.get(process.env.CHANNEL_ID_FACE).send({ embeds: [exampleEmbed], files: [buffer] });
});

bot.login(process.env.BOT_TOKEN);


async function RetrieveMessages(limit = 50, SalaiToken, ChannelId, DiscordBaseUrl) {
    const headers = {
        "Content-Type": "application/json",
        Authorization: SalaiToken,
    };
    const response = await fetch(
        `${DiscordBaseUrl}/api/v10/channels/${ChannelId}/messages?limit=${limit}`,
        {
            headers,
        }
    );
    if (!response.ok) {
        console.log(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
}

async function SendPictureToDiscord(channelId, imageBase64, textMessage = null) {
    if (!imageBase64) {
        throw new Error('No image provided');
    }

    const buffer = Buffer.from(imageBase64, 'base64');
    if (buffer.length > 8 * 1024 * 1024) { // 8 MiB is the max size for files in Discord
        throw new Error('Image is too large');
    }

    const channel = bot.channels.cache.get(channelId);
    if (!channel) {
        throw new Error(`Channel with ID ${channelId} not found`);
    }

    try {
        let message;
        if (textMessage) {
            message = await channel.send(textMessage, {
                files: [{
                    attachment: buffer,
                    name: 'image.png' // Discord needs a file name to process the attachment
                }]
            });
        } else {
            message = await channel.send({
                files: [{
                    attachment: buffer,
                    name: 'image.png'
                }]
            });
        }

        if (!message.attachments.first()) {
            throw new Error('No attachments in the message');
        }

        return message.attachments.first().url;
    } catch (err) {
        throw new Error(`Failed to send picture to Discord: ${err.message}`);
    }
}

async function sendMessageWithAttachment(channelId, filePath, textMessage = '') {
    // Ensure the client is logged in
    if (!bot.readyAt) {
        throw new Error('Client is not ready');
    }

    // Get the channel
    const channel = bot.channels.cache.get(channelId);
    if (!channel) {
        throw new Error(`Channel with ID ${channelId} not found`);
    }

    // Create the attachment
    const attachment = new Discord.MessageAttachment(filePath);

    // Send the message
    try {
        const message = await channel.send(textMessage, attachment);
        return message.id;
    } catch (err) {
        throw new Error(`Failed to send message: ${err.message}`);
    }
}


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

app.post('/api/poli', haltOnTimedout, verifyToken, async (req, res) => {
    try {
        //Steps
        /*
        1. Receive the image base64
        2. Send the image to Discord
        3. Describe the image
        4. build prompt
        5. Send the prompt to Midjorney
        */
        //1. Receive the image base64
        const base64String = req.body.image;
        const style = req.body.style;
        const context = req.body.context;
        //2. Send the image to Discord
        const url = await SendPictureToDiscord(process.env.CHANNEL_ID_FACE, base64String);
        //3. Describe the image
        var describe = await client.Describe(url);
        console.log("describe",describe);

        //4. build prompt

        // Ejemplo de uso
        const imageURL = url;
        const description = describe.descriptions[0].substring(describe.descriptions[0].indexOf(' ') + 1).replace(' --ar 3:4', '');
        const parameters = "--v 5 --stylize 1000 --ar 3:4";

        const prompt = promptGenerator(imageURL, description, style, context, parameters);
        await client.init();
        //5. Send the prompt to Midjorney
        specificLogger.info(`/api/poli: <${req.user.token}> New prompt ${prompt}`);
        const Imagine = await client.Imagine(
            prompt,
            (uri, progress) => {
                generalLogger.info("loading", uri, "progress", progress);
            }
        );
        generalLogger.info(Imagine);
        specificLogger.info(`/api/poli: <${req.user.token}> New Imagine ${Imagine.proxy_url}`);
        if (!Imagine) {
            generalLogger.info("no message");
            return res.json({ message: 'No message' });
        }
        let upscales = [];
        //5.1 Select the upscales
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
            specificLogger.info(`/api/poli Upscale: <${req.user.token}> New Upscale ${Upscale.proxy_url}`);
            upscales.push(Upscale.proxy_url);
        }
        res.json({ message: 'Imagine', result: Imagine.proxy_url, upscale: upscales, prompt: prompt });

    } catch (error) {
        console.error(error.message);
        generalLogger.error(error.message);
        res.status(500).json({ error: error.message });
    }
    finally {
        client.Close();
    }
});

const promptGenerator = (imageURL, description, style, context, parameters) => {
    return `${imageURL}  ${description}  ::  ${style}  ::  ${context}  ${parameters}`;
};


app.listen(port, () => {
    generalLogger.info(`Servidor corriendo en http://localhost:${port}`);
});