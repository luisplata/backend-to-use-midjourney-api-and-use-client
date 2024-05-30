const jwt = require('jsonwebtoken');
const { specificLogger } = require('../utils/logger.js');

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

module.exports = { verifyToken };