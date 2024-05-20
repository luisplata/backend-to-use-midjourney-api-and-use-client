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
const bcrypt = require('bcrypt');
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

// Middleware para verificar el token
function verifyToken(req, res, next) {
    // Obtén el token de la cabecera Authorization
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        // Si no hay token, devuelve un error
        return res.sendStatus(401);
    }

    // Verifica el token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            // Si el token es inválido, devuelve un error
            return res.sendStatus(403);
        }

        // Si el token es válido, guarda el usuario en req.user y pasa al siguiente middleware
        req.user = user;
        next();
    });
}

app.post('/api/imagine', verifyToken, async (req, res) => { // Convertir a función asíncrona
    await client.init();
    const prompt = req.body.prompt; // Obtener el prompt del cuerpo de la solicitud
    const Imagine = await client.Imagine(
        prompt,
        (uri, progress) => {
            console.log("loading", uri, "progress", progress);
        }
    );
    console.log(Imagine);
    if (!Imagine) {
        console.log("no message");
        return res.json({ message: 'No message' }); // Enviar respuesta si no hay mensaje
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

//security
app.post('/api/get-token', async (req, res) => {
    const password = req.body.password;

    try {
        // Verificar la contraseña
        const match = await bcrypt.compare(password, hashedPassword);

        if (match) {
            // Si la contraseña es correcta, genera y devuelve un token de API
            const apiToken = jwt.sign({ user: 'user' }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.json({ apiToken });
        } else {
            // Si la contraseña es incorrecta, devuelve un error
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