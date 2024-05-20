const express = require('express');
const { Midjourney } = require('midjourney');
const cors = require('cors');
const app = express();
const port = 3000;
require('dotenv/config');
app.use(express.json());
app.use(cors());
const path = require('path');
app.use(express.static(path.join(__dirname, 'client')));

//security
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const myPlaintextPassword = 'contraseniaParaConvexa@2024';
const saltRounds = 10;

let hashedPassword = '';
bcrypt.hash(myPlaintextPassword, saltRounds, function(err, hash) {
    hashedPassword = hash;
  });

const client = new Midjourney({
    ServerId: process.env.SERVER_ID,
    ChannelId: process.env.CHANNEL_ID,
    SalaiToken: process.env.SALAI_TOKEN,
    Debug: true,
    Ws: true,
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/index.html'));
});

function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.sendStatus(401);
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.sendStatus(403);
        }
        req.user = user;
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
    const prompt = req.body.prompt;
    const Imagine = await client.Imagine(
        prompt,
        (uri, progress) => {
            console.log("loading", uri, "progress", progress);
        }
    );
    console.log(Imagine);
    if (!Imagine) {
        console.log("no message");
        return res.json({ message: 'No message' });
    }

    const U1CustomID = Imagine.options?.find((o) => o.label === "U4")?.custom;
    if (!U1CustomID) {
        console.log("no U4");
        return res.json({ message: 'No U4' });
    }
    const Upscale = await client.Custom({
        msgId: Imagine.id,
        flags: Imagine.flags,
        customId: U1CustomID,
        loading: (uri, progress) => {
            console.log("loading", uri, "progress", progress);
        },
    });
    if (!Upscale) {
        console.log("no Upscale");
        return res.json({ message: 'No Upscale' });
    }
    console.log(Upscale);

    res.json({ message: 'Imagine', result: Imagine.proxy_url, upscale: Upscale.proxy_url });
});

app.post('/api/get-token', async (req, res) => {
    const password = req.body.password;
    try {
        const match = await bcrypt.compare(password, hashedPassword);

        if (match) {
            const apiToken = jwt.sign({ user: 'user' }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.json({ token: apiToken });
        } else {
            res.status(403).json({ error: 'Invalid password; use `?password=[password]` to can use the app' });
        }
    } catch (error) {
        console.error(error);
        res.status(403).json({ error: 'Invalid password; use `?password=[password]` to can use the app' });
    }
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});