const express = require('express');
const Midjourney = require('midjourney').Midjourney;
const { generalLogger, specificLogger } = require('../utils/logger.js');
const { verifyToken } = require('../middleware/auth.js');
const { sendPictureToDiscord } = require('../utils/discordUtils.js');
const dotenv = require('dotenv');
dotenv.config();

const router = express.Router();
const client = new Midjourney({
    ServerId: process.env.SERVER_ID,
    ChannelId: process.env.CHANNEL_ID,
    SalaiToken: process.env.SALAI_TOKEN,
    Debug: true,
    Ws: true,
});

router.post('/info', verifyToken, async (req, res) => {
    try {
        await client.init();
        const info = await client.Info();
        res.json(info);
    } catch (error) {
        generalLogger.error(error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.Close();
    }
});

router.post('/imagine', verifyToken, async (req, res) => {
    try {
        await client.init();
        const promptOriginal = req.body.prompt;
        const prompt = promptOriginal;
        specificLogger.info(`/api/imagine: <${req.user.token}> New prompt ${prompt}`);

        const Imagine = await client.Imagine(prompt, (uri, progress) => {
            generalLogger.info("loading", uri, "progress", progress);
        });
        if (!Imagine) {
            return res.json({ message: 'No message' });
        }

        const upscales = [];
        for (let i = 1; i <= 4; i++) {
            const label = `U${i}`;
            const customID = Imagine.options?.find((o) => o.label === label)?.custom;
            if (customID) {
                const Upscale = await client.Custom({
                    msgId: Imagine.id,
                    flags: Imagine.flags,
                    customId: customID,
                    loading: (uri, progress) => {
                        generalLogger.info("loading", uri, "progress", progress);
                    },
                });
                upscales.push(Upscale ? Upscale.proxy_url : { message: 'No Upscale' });
            } else {
                upscales.push({ message: `No ${label}` });
            }
        }
        res.json({ message: 'Imagine', result: Imagine.proxy_url, upscale: upscales, prompt: promptOriginal });
    } catch (error) {
        generalLogger.error(error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.Close();
    }
});

router.post('/poli', verifyToken, async (req, res) => {
    try {
        console.log(req.body);
        const { image, style, context } = req.body;
        const url = await sendPictureToDiscord(process.env.CHANNEL_ID_FACE, image);
        const describe = await client.Describe(url);
        generalLogger.info("describe", describe);
        const description = describe.descriptions[0].replace(/.*? --ar 3:4/, '');
        const parameters = "--v 5 --stylize 1000 --ar 3:4";
        const prompt = `${url}  ${description}  ::  ${style}  ::  ${context}  ${parameters}`;

        await client.init();
        const Imagine = await client.Imagine(prompt, (uri, progress) => {
            generalLogger.info("loading", uri, "progress", progress);
        });

        if (!Imagine) {
            return res.json({ message: 'No message' });
        }

        const upscales = [];
        for (let i = 1; i <= 4; i++) {
            const label = `U${i}`;
            const customID = Imagine.options?.find((o) => o.label === label)?.custom;
            if (customID) {
                const Upscale = await client.Custom({
                    msgId: Imagine.id,
                    flags: Imagine.flags,
                    customId: customID,
                    loading: (uri, progress) => {
                        generalLogger.info("loading", uri, "progress", progress);
                    },
                });
                upscales.push(Upscale ? Upscale.proxy_url : { message: 'No Upscale' });
            } else {
                upscales.push({ message: `No ${label}` });
            }
        }
        res.json({ message: 'Imagine', result: Imagine.proxy_url, upscale: upscales, prompt });
    } catch (error) {
        generalLogger.error(error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.Close();
    }
});

module.exports = router;
