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
                try {
                    const Upscale = await client.Custom({
                        msgId: Imagine.id,
                        flags: Imagine.flags,
                        customId: customID,
                        loading: (uri, progress) => {
                            generalLogger.info("loading", uri, "progress", progress);
                        },
                    });
                    upscales.push(Upscale ? Upscale.proxy_url : { message: 'No Upscale' });
                } catch (upscaleError) {
                    generalLogger.error(`Upscale error for ${label}: ${upscaleError.message}`);
                    upscales.push({ message: `No ${label}` });
                }
            } else {
                upscales.push({ message: `No ${label}` });
            }
        }
        return res.json({ message: 'Imagine', result: Imagine.proxy_url, upscale: upscales, prompt: promptOriginal });
    } catch (error) {
        generalLogger.error(`Main process error: ${error.message}`);
        if (!res.headersSent) {
            return res.status(500).json({ error: error.message });
        }
    } finally {
        client.Close();
    }
});

router.post('/poli', verifyToken, async (req, res) => {
    try {
        console.log(req.body);
        const { image, style, context } = req.body;
        const url = await sendPictureToDiscord(process.env.CHANNEL_ID_FACE, image);
        // The description functionality is commented out, so no changes are made here.
        const parameters = " --ar 3:4";
        const prompt = `${url} ${GetPromptFromID(context)} ${parameters}`;

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

function GetPromptFromID(id) {
    console.log(`ID: ${id}`);
    switch (id) {
        case "Grupo1":
            return "a partir de  la imagen manteniendo su apariencia realista para crear profesional de administración de empresas de estilo lujoso, en una oficina elegante, Incorpora con elementos de empresa gastronomica y hotelera";
        case "Grupo2":
            return "Convert the image into a detailed and precise financial illustration incorporate numbers and Financial items.";
        case "Grupo3":
            return "Convert the image into a naturalism style incorporate agronomy trade and ecology items";
        case "Grupo4":
            return "Create an artistic collage using the image and other visuals to incorporate Logistics and international Business items";
        case "Grupo5":
            return "Convert image into professional Workplace Safety and Human Resources drawing with dynamic perspective and depth effects";
        case "Grupo6":
            return "Turn the image into a professional lawyer in opulent style incorporate justness items";
        case "Grupo7":
            return "Convert the image to a teacher in classroom";
        case "Grupo8":
            return "turn the image into a psychologist in an office Transitional style digital illustration with sharp lines";
        case "Grupo9":
            return "Convert the image into a photograph with smooth light and motion effects incorporate journalism and mass media items";
        case "Grupo10":
            return "Create an artistic collage using the image and other visuals to incorporate marketing and publicity items postmodernism style";
        case "Grupo11":
            return "Give the image an industrial design painting look with precise details and clean lines to incorporate industrial design elements around";
        case "Grupo12":
            return "Give the image a futuristic look with technological and abstract elements";
        case "Grupo13":
            return "Give the image a stylish and sophisticated fashion illustration look";
        case "Grupo14":
            return "Convert the image into a detailed and precise financial an mathematical illustration+to incorporate numbers and mathematical items";
        default:
            throw new Error(`Invalid group: ${id}`);
    }
}

module.exports = router;
