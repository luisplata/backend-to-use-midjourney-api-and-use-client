const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { specificLogger } = require('../utils/logger.js');
const dotenv = require('dotenv');
dotenv.config();

const router = express.Router();
const saltRounds = 10;
let hashedPassword = process.env.JWT_SECRET;

bcrypt.hash(process.env.JWT_PASS, saltRounds, (err, hash) => {
    if (err) {
        console.error('Error hashing password:', err);
    } else {
        hashedPassword = hash;
    }
});

router.post('/get-token', async (req, res) => {
    const { password } = req.body;
    try {
        const match = await bcrypt.compare(password, hashedPassword);
        if (match) {
            const apiToken = jwt.sign({ user: 'user' }, process.env.JWT_SECRET, { expiresIn: '1h' });
            specificLogger.info(`/auth/get-token: New user connected ${apiToken}`);
            res.json({ token: apiToken });
        } else {
            res.status(403).json({ error: 'Invalid password' });
        }
    } catch (error) {
        specificLogger.error(error);
        res.status(403).json({ error: 'Invalid password' });
    }
});

module.exports = router;
