const jwt = require('jsonwebtoken');
const { generalLogger } = require('../utils/logger.js');

function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const uri = req.originalUrl;

    if (token == null) {
        return res.sendStatus(401);
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            generalLogger.error(`Error verifying token ${token} for ${uri}: ${err.message}`);
            return res.sendStatus(403);
        }
        user.token = token;
        req.user = user;
        next();
    });
}

module.exports = { verifyToken };